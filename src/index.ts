
const ASSET_URL = 'frag_bunny.mp4';
const MIME_CODEC = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
const TOTAL_SEGMENTS = 5;
const PRE_FETCH_AHEAD = 1; // optionally fetch one segment ahead on seek/playhead advance

interface SegmentInfo {
  index: number;
  startByte: number;
  endByte: number; // inclusive
  requested: boolean;
  appended: boolean;
}

const video = document.querySelector('video') as HTMLVideoElement | null;

let mediaSource: MediaSource | null = null;
let sourceBuffer: SourceBuffer | null = null;

let fileLength = 0;
let segmentLength = 0;
let segmentDuration = 0;
let segments: SegmentInfo[] = [];
let appending = false;

function init() {
  if (!('MediaSource' in window) || !MediaSource.isTypeSupported(MIME_CODEC)) {
    console.error('Unsupported MIME type or codec', MIME_CODEC);
    return;
  }
  if (!video) throw new Error('VIDEO_ELEMENT_NOT_FOUND');

  mediaSource = new MediaSource();
  // The sourceopen event is fired when a MediaSource object's readyState changes to "open". 
  // This indicates that the MediaSource is ready to receive data from SourceBuffer objects. 
  // This can occur either when the MediaSource object is first attached to a media element or when the readyState changes from "ended" back to "open".
  mediaSource.addEventListener('sourceopen', onSourceOpen as EventListener, { once: true });
  video.src = URL.createObjectURL(mediaSource);
  video.addEventListener('seeking', onSeeking as EventListener);
  video.addEventListener('timeupdate', onTimeUpdate as EventListener);
  video.addEventListener('canplay', onCanPlay, { once: true });
}

async function onSourceOpen() {
  if (!mediaSource || !video) return;
  sourceBuffer = mediaSource.addSourceBuffer(MIME_CODEC);
  sourceBuffer.addEventListener('error', (e: Event) => console.error('SOURCE_BUFFER_ERROR', e));
  try {
    fileLength = await getFileLength(ASSET_URL);
    segmentLength = Math.ceil(fileLength / TOTAL_SEGMENTS);
    buildSegmentTable();
    console.log('MediaSource opened', { fileMB: (fileLength / 1024 / 1024).toFixed(2), segmentLength, TOTAL_SEGMENTS });
    // Fetch & append first segment eagerly so we can get duration metadata.
    await fetchAndAppendSegmentByIndex(0);
    // Listen for canplay and continue setup there
  } catch (err) {
    console.error('Init failure', err);
  }
}

function buildSegmentTable() {
  segments = [];
  for (let i = 0; i < TOTAL_SEGMENTS; i++) {
    const start = i * segmentLength;
    const end = (i === TOTAL_SEGMENTS - 1) ? (fileLength - 1) : ((i + 1) * segmentLength - 1);
    segments.push({ index: i, startByte: start, endByte: end, requested: false, appended: false });
  }
}


function onCanPlay() {
  if (!video) return;
  segmentDuration = (video.duration || 0) / TOTAL_SEGMENTS;
  if (video.paused) video.play().catch(() => { console.error('Error: UNABLE_TO_PLAY_VIDEO - Make sure to interract with the page first'); });
}

async function getFileLength(url: string): Promise<number> {
  const res = await fetch(url, { method: 'HEAD' });
  const lenStr = res.headers.get('content-length');
  if (!lenStr) throw new Error('No content-length header');
  return Number(lenStr);
}

async function fetchRange(start: number, end: number): Promise<ArrayBuffer> {
  const res = await fetch(ASSET_URL, {
    headers: { 'Range': `bytes=${start}-${end}` }
  });
  if (!res.ok && res.status !== 206 && res.status !== 200) {
    throw new Error(`Bad range response ${res.status}`);
  }
  console.log('Fetched bytes', start, '-', end);
  return await res.arrayBuffer();
}

function getSegmentIndexForTime(timeSec: number): number {
  if (!segmentDuration || !isFinite(segmentDuration) || segmentDuration === 0) return 0;
  return Math.min(TOTAL_SEGMENTS - 1, Math.max(0, Math.floor(timeSec / segmentDuration)));
}

async function fetchAndAppendSegmentByIndex(index: number): Promise<void> {
  const seg = segments[index];
  if (!seg) return;
  if (seg.appended || seg.requested) return; // already in-flight or done
  seg.requested = true;
  try {
    const chunk = await fetchRange(seg.startByte, seg.endByte);
    await appendSegment(index, chunk);
  } catch (e) {
    console.error('Segment fetch/append failed', index, e);
    seg.requested = false; // allow retry
  }
}

async function appendSegment(index: number, chunk: ArrayBuffer): Promise<void> {
  if (!sourceBuffer) throw new Error('No sourceBuffer');
  // Wait if sourceBuffer is updating
  while (sourceBuffer.updating || appending) {
    await waitSourceBufferUpdate();
  }
  appending = true;
  return new Promise<void>((resolve, reject) => {
    if (!sourceBuffer) return reject('SourceBuffer vanished');
  const seg = segments[index];
    const onError = () => {
      cleanup();
      reject(new Error('appendBuffer error'));
    };
    const onUpdateEnd = () => {
      cleanup();
      if (seg) seg.appended = true;
      logBuffered();
      resolve();
    };
    const cleanup = () => {
      sourceBuffer?.removeEventListener('error', onError);
      sourceBuffer?.removeEventListener('updateend', onUpdateEnd);
      appending = false;
    };
    sourceBuffer.addEventListener('error', onError, { once: true });
    sourceBuffer.addEventListener('updateend', onUpdateEnd, { once: true });
    try {
      sourceBuffer.appendBuffer(chunk);
    } catch (err) {
      cleanup();
      reject(err);
    }
  });
}

function waitSourceBufferUpdate(): Promise<void> {
  return new Promise(res => setTimeout(res, 25));
}

function logBuffered() {
  if (!sourceBuffer) return;
  const b = sourceBuffer.buffered;
  if (b.length) {
    const start = b.start(0);
    const end = b.end(b.length - 1);
    console.log('Buffered range', { start, end, seconds: (end - start).toFixed(2) });
  }
}

function onTimeUpdate() {
  if (!video) return;
  loadSegment(video.currentTime);
}

function onSeeking() {
  if (!video) return;
  console.log('Seeking to', video.currentTime.toFixed(2));
  if (mediaSource && mediaSource.readyState === 'open' && sourceBuffer && sourceBuffer.updating) {
    try { sourceBuffer.abort(); } catch { /* ignore */ }
  }
  loadSegment(video.currentTime, true);
}

function loadSegment(time: number, isSeek = false) {
  const targetIndex = getSegmentIndexForTime(time);
  fetchAndAppendSegmentByIndex(targetIndex);

  const currentSegEndTime = segmentDuration * (targetIndex + 1);
  const pctWithinSegment = segmentDuration ? (time - targetIndex * segmentDuration) / segmentDuration : 0;
  const nearSegmentEnd = pctWithinSegment > 0.7; // heuristic
  if ((isSeek || nearSegmentEnd) && PRE_FETCH_AHEAD > 0) {
    for (let i = 1; i <= PRE_FETCH_AHEAD; i++) {
      const nextIndex = targetIndex + i;
  if (nextIndex < TOTAL_SEGMENTS) fetchAndAppendSegmentByIndex(nextIndex);
    }
  }
  // If we already have duration & user jumped far ahead, request intermediate missing segments as well
  if (isSeek && segmentDuration) {
    for (let i = 0; i < targetIndex; i++) {
      // Only request earlier segments if user might seek back soon (optional). Keeping them helps reverse seek.
      const seg = segments[i];
  if (seg && !seg.requested) fetchAndAppendSegmentByIndex(i);
    }
  }
  // If current segment fully appended & we approach its end, ensure next queued
  if (segmentDuration && currentSegEndTime - time < segmentDuration * 0.3) {
    const next = targetIndex + 1;
  if (next < TOTAL_SEGMENTS) fetchAndAppendSegmentByIndex(next);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});
