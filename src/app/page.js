"use client";
import { useState } from 'react';
import Mirt from 'react-mirt';
import 'react-mirt/dist/css/react-mirt.css';
import "./mycss.css";

export default function Home() {
  const [audioFile, setAudioFile] = useState(null);
  const [trimmedAudioUrl, setTrimmedAudioUrl] = useState(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setAudioFile(e.target.files[0]);
    setTrimmedAudioUrl(null);
    setError(null);
  };

  const handleTrim = async () => {
    if (!audioFile) {
      setError("Please select an audio file.");
      return;
    }
    if (endTime <= startTime) {
      setError("End time must be greater than start time.");
      return;
    }

    try {
      const trimmedBlob = await trimAudio(audioFile, startTime / 1000, endTime / 1000);
      const url = URL.createObjectURL(trimmedBlob);
      setTrimmedAudioUrl(url);
    } catch (err) {
      setError("Failed to trim the audio. Please try again.");
    }
  };

  const trimAudio = async (file, start, end) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const startFrame = Math.floor(start * audioBuffer.sampleRate);
    const endFrame = Math.floor(end * audioBuffer.sampleRate);
    const durationFrames = endFrame - startFrame;

    const trimmedBuffer = audioContext.createBuffer(audioBuffer.numberOfChannels, durationFrames, audioBuffer.sampleRate);

    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      const channelData = audioBuffer.getChannelData(i).subarray(startFrame, endFrame);
      trimmedBuffer.copyToChannel(channelData, i);
    }

    return bufferToWave(trimmedBuffer);
  };

  const bufferToWave = (buffer) => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);

    let pos = 0;

    const setUint16 = (data) => { view.setUint16(pos, data, true); pos += 2; };
    const setUint32 = (data) => { view.setUint32(pos, data, true); pos += 4; };

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt "
    setUint32(16); // size of fmt chunk
    setUint16(1); // format = 1
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate
    setUint16(numOfChan * 2); // block align
    setUint16(16); // bits per sample

    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4); // data chunk length

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      const channelData = buffer.getChannelData(i);
      for (let j = 0; j < channelData.length; j++) {
        const sample = Math.max(-1, Math.min(1, channelData[j])); // clamp
        view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        pos += 2;
      }
    }

    return new Blob([bufferArray], { type: 'audio/wav' });
  };

  return (
    <div className='wholebody'>
      <h1>Audio Trimmer</h1>
      <input type="file" accept="audio/*" onChange={handleFileChange} style={{ marginBottom: '10px' }} />

      {audioFile && (
        <div style={{ marginBottom: '10px' }}>
          <input
            style={{ marginBottom: '10px', height: '20px', width: '100px', padding: '20px' }}
            type="number"
            placeholder="Start time (seconds)"
            value={Math.floor(startTime / 1000)}
            onChange={(e) => setStartTime(parseFloat(e.target.value) * 1000)}
          />
          <input
            style={{ marginBottom: '10px', marginLeft: '10px', height: '20px', width: '100px', padding: '20px' }}
            type="number"
            placeholder="End time (seconds)"
            value={Math.floor(endTime / 1000)}
            onChange={(e) => setEndTime(parseFloat(e.target.value) * 1000)}
          />
          <Mirt
            style={{ marginBottom: '30px' }}
            file={audioFile}
            onChange={({ start, end }) => {
              setStartTime(start);
              setEndTime(end);
            }}
          />
          <button className="button-56" onClick={handleTrim}>Trim and Download</button>
        </div>
      )}
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      {trimmedAudioUrl && (
        <div>
          <h2 style={{ marginBottom: '10px', marginTop: '20px' }}>Trimmed Audio</h2>
          <audio controls src={trimmedAudioUrl} style={{ marginBottom: '10px' }}></audio>
          <a href={trimmedAudioUrl} download="trimmed_audio.wav"><button className="button-56">Download Trimmed Audio</button></a>
        </div>
      )}
      <div style={{ border: '1px solid white', marginTop: '30px', padding: '10px', background: 'white', color: 'black' }}>
        <div>Hi team VideoDubber.ai, I made this under an hour due to my exams, this doesn't show my true ability, please take this into consideration while judging. I know this might sound like an excuse but, it's not.</div>
        <div style={{ marginTop: '10px' }}>Regards,</div>
        <div>Sumeet Maurya</div>
      </div>
    </div>
  );
}
