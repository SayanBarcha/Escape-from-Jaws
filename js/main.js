class Timer {
  constructor(el) {
    this.dom = { el };

    this.started = false;
    this.interval = null;
    this.seconds = this.tens = 0;
  }

  start() {
    this.started = true;
    this.interval = setInterval(() => this.update(), 10);
  }

  pause() {
    this.started = false;

    if (this.interval) clearInterval(this.interval);
  }

  update() {
    this.tens++;

    if (this.tens > 99) {
      this.seconds++;
      this.tens = 0;
    }

    this.dom.el.innerText = this.format();
  }

  format() {
    let secs = this.seconds;
    let tens = this.tens;

    if (this.seconds < 10) secs = `0${this.seconds}`;
    if (this.tens < 10) tens = `0${this.tens}`;

    return `${secs}:${tens}`;
  }

  reset() {
    this.pause();
    this.seconds = this.tens = 0;

    this.dom.el.innerText = this.format();
  }
}

class Game {
  constructor() {
    this.dom = {
      game: document.querySelector(".game"),
      start: document.querySelector(".start"),
      timer: document.querySelector(".timer"),
      jaws: document.querySelector(".jaws"),
      duration: document.querySelector(".popup__duration"),
      replay: document.querySelector(".replay")
    };

    this.audio = {
      previous: null,
      current: null,
      slow: new Howl({
        src: ["https://i.smnarnold.com/jaws/sounds/1.ogg"],
        loop: true,
        volume: 0
      }),
      medium: new Howl({
        src: ["https://i.smnarnold.com/jaws/sounds/2.ogg"],
        loop: true,
        volume: 0
      }),
      fast: new Howl({
        src: ["https://i.smnarnold.com/jaws/sounds/3.ogg"],
        loop: true,
        volume: 0
      }),
      danger: new Howl({
        src: ["https://i.smnarnold.com/jaws/sounds/4.ogg"],
        loop: true,
        volume: 0
      }),
      scream: new Howl({
        src: ["https://i.smnarnold.com/jaws/sounds/scream.ogg"],
        volume: 1
      })
    };

    this.game = {
      started: false,
      paused: false,
      width: 0,
      height: 0
    };

    this.jaws = {
      x: 0,
      y: 0,
      ratio: 20,
      trip: 0,
      zones: []
    };

    this.timer = new Timer(this.dom.timer);

    this.init();
  }

  init() {
    this.getGameSize();
    this.getJawsSize();
    this.bindEvents();
  }

  bindEvents() {
    this.dom.start.addEventListener("click", () => this.start());
    this.dom.replay.addEventListener("click", () => this.start());
    document.addEventListener("mousemove", (e) => this.getUserPos(e));
    document.addEventListener("mouseleave", (e) => this.userLeavePage(e));
    document.addEventListener("mouseenter", (e) => this.userEnterPage(e));
  }

  getUserPos(e) {
    if (this.game.started) {
      this.user.x = e.pageX;
      this.user.y = e.pageY;
    }
  }

  userLeavePage(e) {
    if (
      e.clientY <= 0 ||
      e.clientX <= 0 ||
      e.clientX >= window.innerWidth ||
      e.clientY >= window.innerHeight
    ) {
      this.game.paused = true;
      this.pause();
    }
  }

  userEnterPage() {
    if (this.game.started && this.game.paused) {
      this.game.paused = false;
      this.unpaused();
    }
  }

  reset() {
    this.user = {
      x: 0,
      y: 0
    };

    this.timer.reset();

    this.game.paused = false;

    this.jaws.trip = 0;
    this.jaws.minX = 0;
    this.jaws.maxX = this.game.width - this.jaws.size;
    this.jaws.minY = 0;
    this.jaws.maxY = this.game.height - this.jaws.size;
    this.dom.jaws.classList.remove("flip");

    const jaws = this.getJawsRandomPosition();
    this.jaws.x = jaws.x;
    this.jaws.y = jaws.y;
    this.updateJawsPosition();
    this.setJawsObjective();

    this.dom.game.classList.remove("is-dead");
  }

  start() {
    this.reset();

    this.game.started = true;
    this.dom.game.classList.add("is-started");
    this.timer.start();

    this.audio.slow.play();
    this.audio.medium.play();
    this.audio.fast.play();
    this.audio.danger.play();
  }

  getGameSize() {
    this.game.width = this.dom.game.clientWidth;
    this.game.height = this.dom.game.clientHeight;
  }

  getJawsSize() {
    let ratio = this.jaws.ratio / 100;
    let width = this.game.width * ratio;
    let height = this.game.height * ratio;

    this.jaws.size = Math.round((width + height) / 2);
    this.jaws.halfSize = this.jaws.size / 2;

    this.jaws.zones.push(this.jaws.halfSize); // You're dead
    this.jaws.zones.push(this.jaws.zones[0] * 2.5); // You're in danger
    this.jaws.zones.push(this.jaws.zones[1] * 1.75); // Ok-ishhhh
    this.jaws.zones.push(this.jaws.zones[2] * 1.5); // Relax

    this.dom.jaws.style.width = `${this.jaws.size}px`;
    this.dom.jaws.style.height = `${this.jaws.size}px`;
  }

  getJawsRandomPosition() {
    return {
      x: Math.floor(Math.random() * this.jaws.maxX),
      y: Math.floor(Math.random() * this.jaws.maxY)
    };
  }

  setJawsObjective() {
    this.jaws.objective = this.getJawsRandomPosition();
    const luck = Math.random();

    if (this.game.started && luck > 0.1) {
      this.jaws.objective.x = Math.max(
        this.jaws.minX,
        Math.min(this.user.x - this.jaws.halfSize, this.jaws.maxX)
      );
      this.jaws.objective.y = Math.max(
        this.jaws.minY,
        Math.min(this.user.y - this.jaws.halfSize, this.jaws.maxY)
      );
    }

    const distance = this.getDistance(this.jaws, this.jaws.objective);
    this.jaws.objective.duration = distance / (100 + this.jaws.trip);

    this.jaws.animation = gsap.to(this.dom.jaws, {
      x: this.jaws.objective.x,
      y: this.jaws.objective.y,
      ease: "linear",
      duration: this.jaws.objective.duration,
      onComplete: () => {
        this.jaws.trip += 10;
        this.jaws.x = this.jaws.objective.x;
        this.jaws.y = this.jaws.objective.y;
        this.setJawsObjective();
      },
      onUpdate: _.throttle(() => this.mix(), 250)
    });
  }

  mix() {
    const proximity = this.getProximity();

    if (proximity < this.jaws.zones[0]) {
      this.death();
    } else if (proximity < this.jaws.zones[1]) {
      this.audio.current = "danger";
    } else if (proximity < this.jaws.zones[2]) {
      this.audio.current = "fast";
    } else if (proximity < this.jaws.zones[3]) {
      this.audio.current = "medium";
    } else {
      this.audio.current = "slow";
    }

    if (this.audio.current !== this.audio.previous) {
      this.audio[this.audio.current].fade(0, 1, 200);

      if (this.audio.previous !== null) {
        this.audio[this.audio.previous].fade(1, 0, 400);
      }

      this.audio.previous = this.audio.current;
    }
  }

  death() {
    this.setJawsDirection();

    this.game.started = false;
    this.dom.duration.innerText = this.timer.format();
    this.dom.game.classList.add("is-dead");

    this.pause();
    this.audio.scream.play();
  }

  setJawsDirection() {
    if (this.jaws.x - this.jaws.size / 4 > this.user.x) {
      this.dom.jaws.classList.add("flip");
    }
  }

  pause() {
    this.timer.pause();

    if (this.jaws?.animation) {
      this.jaws.animation.pause();
    }

    this.audio.slow.pause();
    this.audio.medium.pause();
    this.audio.fast.pause();
    this.audio.danger.pause();
  }

  unpaused() {
    this.timer.start();

    if (this.jaws?.animation) {
      this.jaws.animation.play();
    }

    this.audio.slow.play();
    this.audio.medium.play();
    this.audio.fast.play();
    this.audio.danger.play();
  }

  getDistance(start, end) {
    return Math.hypot(end.x - start.x, end.y - start.y);
  }

  getProximity() {
    const jaws = {
      x: gsap.getProperty(this.dom.jaws, "x") + this.jaws.halfSize,
      y: gsap.getProperty(this.dom.jaws, "y") + this.jaws.halfSize
    };

    this.setStereo(jaws);

    return this.getDistance(jaws, this.user);
  }

  setStereo(jaws) {
    let distanceX = (jaws.x - this.user.x) / (this.game.width / 2);
    distanceX = Math.min(Math.max(-1, distanceX), 1);

    this.audio.slow.stereo(distanceX);
    this.audio.medium.stereo(distanceX);
    this.audio.fast.stereo(distanceX);
    this.audio.danger.stereo(distanceX);
  }

  updateJawsPosition() {
    this.dom.jaws.style.transform = `translate(${this.jaws.x}px, ${this.jaws.y}px)`;
  }
}

const game = new Game();
