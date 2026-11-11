type VideoPlayer = { video: HTMLVideoElement; controller: AbortController };
let players: VideoPlayer[] = [];

function formatTime(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function setupPlayers() {
  document.querySelectorAll<HTMLElement>('.wiki-video').forEach(figure => {
    if (figure.dataset.enhanced) return;
    const video = figure.querySelector<HTMLVideoElement>('video');
    const launch = figure.querySelector<HTMLButtonElement>('.wiki-video-launch');
    const controls = figure.querySelector<HTMLElement>('.wiki-video-controls');
    const play = figure.querySelector<HTMLButtonElement>('[data-action="play"]');
    const seek = figure.querySelector<HTMLInputElement>('input[type="range"]');
    const time = figure.querySelector<HTMLOutputElement>('output');
    const status = figure.querySelector<HTMLElement>('[role="status"]');
    if (!video || !launch || !controls || !play || !seek || !time || !status) return;

    const controller = new AbortController();
    const options = { signal: controller.signal };
    const durationHint = Number(video.dataset.duration) || 0;

    function update() {
      const duration = Number.isFinite(video!.duration) ? video!.duration : durationHint;
      const current = video!.currentTime;
      figure.dataset.playing = String(!video!.paused);
      play!.setAttribute('aria-label', video!.paused ? 'Play video' : 'Pause video');
      launch!.setAttribute('aria-label', video!.ended ? 'Replay installation walkthrough' : 'Play installation walkthrough');
      launch!.hidden = !video!.paused || (current > 0 && !video!.ended);
      seek!.disabled = video!.readyState === 0 || duration <= 0;
      seek!.max = String(duration);
      seek!.value = String(current);
      seek!.style.setProperty('--video-progress', `${duration > 0 ? current / duration * 100 : 0}%`);
      time!.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    }

    async function togglePlayback() {
      if (!video!.paused) { video!.pause(); return; }
      if (video!.ended) video!.currentTime = 0;
      try {
        await video!.play();
        status!.hidden = true;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        status!.textContent = 'Playback could not start. Use Open video below.';
        status!.hidden = false;
      }
    }

    play.addEventListener('click', togglePlayback, options);
    launch.addEventListener('click', togglePlayback, options);
    video.addEventListener('click', togglePlayback, options);
    seek.addEventListener('input', () => {
      video.currentTime = Number(seek.value);
      update();
    }, options);
    video.addEventListener('keydown', event => {
      if (event.key === ' ' || event.key.toLowerCase() === 'k') {
        event.preventDefault();
        togglePlayback();
      }
    }, options);
    for (const event of ['play', 'pause', 'ended', 'timeupdate', 'loadedmetadata', 'durationchange']) {
      video.addEventListener(event, update, options);
    }
    video.addEventListener('error', () => {
      status.textContent = 'This video could not be loaded. Use Open video below.';
      status.hidden = false;
    }, options);

    players.push({ video, controller });
    figure.dataset.enhanced = 'true';
    controls.hidden = false;
    video.controls = false;
    video.tabIndex = 0;
    update();
  });
}

setupPlayers();
document.addEventListener('astro:page-load', setupPlayers);
document.addEventListener('astro:before-swap', () => {
  for (const { video, controller } of players) {
    controller.abort();
    video.pause();
  }
  players = [];
});
