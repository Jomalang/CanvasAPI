let canvas;
let ctx;
let flowField;
let flowFieldAnimation;

window.onload = () => {
  canvas = document.getElementById("canvas1");
  //캔버스에 대한 2d 컨텍스트. getContext 메서드는 내장 API임.
  //이거 말고 가져올 수 있는 Context는 'webgl' 이 있음.
  ctx = canvas.getContext("2d");
  //캔버스 객체는 오직 너비와 높이를 속성으로 갖는다.
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  //인스턴스 생성
  flowField = new FlowFieldEffect(ctx, canvas.width, canvas.height);
  // 애니메이션 효과 적용
  // 애니메이션의 첫 프레임에는 timeStamp가 전달되지 않으므로, 0을 명시적으로 전달해줘야 함.
  flowField.animate(0);
};

// 화면에 리사이즈 이벤트 설정
window.addEventListener("resize", () => {
  // 애니메이션 중단
  cancelAnimationFrame(flowFieldAnimation);
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  // 리사이즈 이벤트 발생시마다 새로운 인스턴스를 생성하면
  // 리사이드 이후에도 애니메이션이 계속 진행됨.
  // 다만 이렇게 되면 새로운 인스턴스에 새로운 애니메이션이 시작되므로
  // 이전의 애니메이션을 중단할 필요가 있음.
  flowField = new FlowFieldEffect(ctx, canvas.width, canvas.height);
  // 애니메이션 재개
  // 애니메이션의 첫 프레임에는 timeStamp가 전달되지 않으므로, 0을 명시적으로 전달해줘야 함.
  flowField.animate(0);
});

const mouse = {
  // 마우스 좌표
  x: 0,
  y: 0,
};
window.addEventListener("mousemove", (e) => {
  mouse.x = e.x;
  mouse.y = e.y;
  console.log(mouse);
});

//클래스 기반으로 캡슐화하면서 진행할 예정
class FlowFieldEffect {
  // JS 프라이빗 문법
  // 프라이빗 필드들은 생성자보다 먼저 선언되어야 한다. (왜일까?)
  #ctx;
  #width;
  #height;

  //생성자
  constructor(ctx, width, height) {
    this.#ctx = ctx;
    // 선 두께 지정
    this.#ctx.lineWidth = 1;
    this.#width = width;
    this.#height = height;
    this.angle = 0;
    // 마지막 프레임 시간 기록 (델타 타임 측정용)
    this.lastTime = 0;
    // 이벤트 간격, FPS 조절용. 500을 주면 초당 2프레임 (1,000 / 500 = 2)
    this.interval = 1000 / 60;
    // 델타 타임 누적 카운터(이벤트 간격인 100이 되면 트리거 되도록)
    // 이는 디바이스마다 다른 델타타임을 가져도, 애니메이션이 동일한 이벤트
    // 간격으로 진행되도록 함.
    this.timer = 0;
    // 그리드의 개별 셀의 크기 설정(단위는 픽셀임)
    // 이 값이 15 이하가 되면 애니메이션 FPS에 영향을 줄 우려가 있음.
    this.cellSize = 20;
    this.gradient;
    //그라디언트 객체 생성
    this.#createGradient();
    //그라디언트 적용
    this.#ctx.strokeStyle = this.gradient;
    // 반지름
    this.radius = 0;
    // 반지름 변화량 (velocity/radius)
    this.vr = 0.03;
  }

  // 그라디언트 생성
  #createGradient() {
    // 그라이던트 객체 생성 메서드(시작좌표 두개, 끝 좌표 두개)
    // 이 네개의 좌표가 그라디언트의 크기와 방향을 나타낸다.
    this.gradient = this.#ctx.createLinearGradient(
      0,
      0,
      this.#width,
      this.#height
    );
    //그라디언트 색상 추가 (첫 인자 offset, 두번째 인자 색상)
    this.gradient.addColorStop(0.1, "#ff5c33");
    this.gradient.addColorStop(0.2, "#ff66b3");
    this.gradient.addColorStop(0.4, "#ccccff");
    this.gradient.addColorStop(0.6, "#b3ffff");
    this.gradient.addColorStop(0.8, "#80ff80");
    this.gradient.addColorStop(0.9, "#ffff33");
  }

  //프라이빗 메서드도 제작 가능
  //애니메이션 효과의 단일 프레임 만드는 메서드
  //단일 선 그리기 위한 x, y좌표 전달
  #drawLine(angle, x, y) {
    let positionX = x;
    let positionY = y;
    let dx = mouse.x - positionX;
    let dy = mouse.y - positionY;
    let distance = dx * dx + dy * dy;
    if (distance > 150000) distance = 150000;
    if (distance < 10000) distance = 10000;
    let length = distance / 10000;

    //canvas에서 새로운 도형을 그리기 시작함을 알리는 메서드
    this.#ctx.beginPath();
    //시작 x,y좌표 지정
    this.#ctx.moveTo(x, y);
    this.#ctx.lineTo(
      x + Math.cos(angle) * length,
      y + Math.sin(angle) * length
    );
    // 선의 끝점 x,y좌표 지점
    // 선을 그리는 메서드
    // 선의 기본색은 검정임.
    this.#ctx.stroke();
  }
  // 퍼블릭 메서드로 만들어서 외부에서 호출 가능하게 함
  // timeStamp는 현재 프레임 시간이 저장되어있는 변수. 자동으로 주입됨.
  animate(timeStamp) {
    // 델타 타임은 밀리세컨드임.
    const deltaTime = timeStamp - this.lastTime;
    // lastTime 최신화
    this.lastTime = timeStamp;
    if (this.timer > this.interval) {
      // 이벤트 간격만큼 누적되면 애니메이션 진행
      // 각 프레임마다 이전 기록 지우기
      // 인자로 좌표를 지정해 지우고 싶은 영역 설정
      this.#ctx.clearRect(0, 0, this.#width, this.#height);
      // 반지름 변화
      this.radius += this.vr;
      //변화량 반전
      // if (this.radius > 5) {
      // this.vr *= -1;
      // }

      // y좌표 0부터 화면 최상단까지 반복하며 탐색
      for (let y = 0; y < this.#width; y += this.cellSize) {
        // x좌표 0부터 화면 최상단까지 반복하며 탐색
        for (let x = 0; x < this.#height; x += this.cellSize) {
          // 각 선의 각도 변화
          // 가장 우항에 상수를 곱해버리면 각도가 더 빠르게 변화함.
          // 그 상수에 변화를 주면 나선형 애니메이션을 만들 수 있음.
          const angle =
            (Math.cos(x * 0.001) + Math.sin(y * 0.001)) * this.radius;
          this.#drawLine(angle, x, y);
        }
      }

      // 타이머 리셋
      this.timer = 0;
    } else {
      // 타이머 다시 누적
      this.timer += deltaTime;
    }
    // 애니메이션은 사실 루프의 형태로 구현됨.
    // 대신 루프나 재귀를 직접 구현하진 않아도 됨. 메서드가 제공된다.
    // 다만 스크립트 기반 언어답게 아래처럼만 하면 재귀가 동작하지 않는다. 새 실행컨텍스트에서 this가 달라짐.
    // requestAnimationFrame(this.animate);
    // 따라서 아래처럼 작성해야 재귀를 진행할 수 있다.
    // 이 애니메이션 프레임 메서드는 기본적으로 60번 재랜더링 한다.
    flowFieldAnimation = requestAnimationFrame(this.animate.bind(this));
  }
}
