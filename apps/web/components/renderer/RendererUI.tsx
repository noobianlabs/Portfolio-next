import { RefObject, useEffect, useRef, useState } from "react";
import { CameraHandler, CameraHandlerState } from "./camera/CameraHandler";
import { joinStyles, writeOutChars, writeOutCharsStreaming } from "./util";
import styles from "./RendererUI.module.css"
import { SoundService } from "./sound/SoundService";

const MStoWriteChar = 35;

function useSoundManagement(soundService: SoundService) {
  const [isSoundEnabled, setSoundEnabled] = useState(true);

  function toggleSound() {
    if (isSoundEnabled) {
      disableSound();
    } else {
      enableSound();
    }
  }

  function enableSound() {
    setSoundEnabled(true);
    soundService.enable();
  }

  function disableSound() {
    setSoundEnabled(false);
    soundService.disable();
  }

  return { isSoundEnabled, toggleSound, enableSound, disableSound };
}

export type RendererUIProps = {
  cameraHandlerState: CameraHandlerState,
  cameraHandler: RefObject<CameraHandler | null>,
  soundService: SoundService
}

type SubViewSound = {
  isSoundEnabled: boolean,
  toggleSound: () => void
}

type ElementStateProps = {
  state: CameraHandlerState
}

type SubViewProps = {
  state: CameraHandlerState,
  sound: SubViewSound,
}



function SoundManagementButton(props: { sound: SubViewSound }) {
  const { isSoundEnabled, toggleSound } = props.sound;

  const icon = isSoundEnabled ? "/icons/mute-icon.svg" : "/icons/unmute-icon.svg"

  return (
    <button className={styles['mute-button']} aria-label={isSoundEnabled ? 'Mute sound' : 'Unmute sound'} onClick={() => toggleSound()}>
      <img draggable={false} src={icon} width={25} height={20} alt="" />
    </button>
  )
}

function ChangeSceneButton(props: { targetState: CameraHandlerState, cameraHandler: RefObject<CameraHandler | null> }) {
  const icon = "/icons/camera.svg";

  const { targetState, cameraHandler } = props;

  function changeScene() {
    if (!cameraHandler.current) { return; }
    cameraHandler.current.changeState(targetState);
  }

  return (
    <button className={styles['camera-button']} aria-label={targetState === CameraHandlerState.MonitorView ? 'View the computer' : targetState === CameraHandlerState.Cinematic ? 'View the room' : 'Change camera view'} onClick={() => changeScene()}>
      <img draggable={false} src={icon} width={25} height={20} alt="" />
    </button>
  );
}

function NameAndTime(props: {
  state: CameraHandlerState,
  cameraHandler: RefObject<CameraHandler | null>,
  sound: SubViewSound,
}) {
  const { state, cameraHandler, sound } = props;

  const firstTime = useRef<boolean>(true);
  const cancelContent = useRef<(() => void) | null>(null);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");

  const [done, setDone] = useState(false);

  const isActive = state === CameraHandlerState.FreeRoam;

  useEffect(() => {
    return () => {
      cancelContent.current?.();
      cancelContent.current = null;
      firstTime.current = true;
    };
  }, []);

  useEffect(() => {
    if (!isActive || !firstTime.current) { return; }
    firstTime.current = false;

    let cancelled = false;
    const timeouts = new Set<ReturnType<typeof setTimeout>>();
    const cancelWriters: (() => void)[] = [];
    let interval: ReturnType<typeof setInterval> | undefined;

    function schedule(callback: () => void, delay: number) {
      const handle = setTimeout(() => {
        timeouts.delete(handle);
        if (!cancelled) { callback(); }
      }, delay);
      timeouts.add(handle);
    }

    function formatTime(dateTime: Date): string {
      const hours = String(dateTime.getHours()).padStart(2, '0');
      const minutes = String(dateTime.getMinutes()).padStart(2, '0');
      const seconds = String(dateTime.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }

    function writeAfterDelay(stream: () => string, setter: (value: string) => void, charDelay: number): void {
      schedule(() => {
        cancelWriters.push(writeOutCharsStreaming(stream, setter, MStoWriteChar));
      }, charDelay * MStoWriteChar);
    }

    const name = "Abdullah Saleh";
    const title = "people > profit";

    writeAfterDelay(() => name, setName, 0);
    writeAfterDelay(() => title, setTitle, name.length + 1);
    writeAfterDelay(() => formatTime(new Date()), setTime, name.length + title.length + 2);

    const timeLength = 8;
    const totalWaitTime = (timeLength + name.length + title.length + 2) * MStoWriteChar;
    schedule(() => {
      interval = setInterval(() => {
        if (!cancelled) { setTime(formatTime(new Date())); }
      }, 1000);
    }, totalWaitTime);
    schedule(() => { setDone(true); }, totalWaitTime + MStoWriteChar);

    cancelContent.current = () => {
      cancelled = true;
      for (const handle of timeouts) { clearTimeout(handle); }
      timeouts.clear();
      for (const cancel of cancelWriters) { cancel(); }
      if (interval !== undefined) { clearInterval(interval); }
      interval = undefined;
    };
  }, [isActive]);

  return (
    <div className={joinStyles([
      styles['name-container'],
      isActive ? styles['fade-in'] : styles['fade-out']
    ])}>
      <div>{name && <span>{name}</span>}</div>
      <div>{title && <span>{title}</span>}</div>
      <div>
        {time && <span className={`${done ? styles['time-is-done'] : ''}`}>{time}</span>}
        {done && <SoundManagementButton sound={sound} />}
        {done && <ChangeSceneButton targetState={CameraHandlerState.MonitorView} cameraHandler={cameraHandler} />}
      </div>
    </div>
  );
}

function UserInteractionButtons(props: {
  state: CameraHandlerState,
  cameraHandler: RefObject<CameraHandler | null>,
  sound: SubViewSound,
}) {
  const { state, cameraHandler, sound } = props;

  const isActive = (
    state === CameraHandlerState.Cinematic ||
    state === CameraHandlerState.MonitorView
  );

  return (<>
    <div className={joinStyles([
      styles['sound-container'],
      !isActive ? styles['fade-out'] : null
    ])}>
      <SoundManagementButton sound={sound} />
      <ChangeSceneButton targetState={state === CameraHandlerState.Cinematic ? CameraHandlerState.MonitorView : CameraHandlerState.Cinematic} cameraHandler={cameraHandler} />
    </div>
  </>);
}

function CinematicInstructions(props: SubViewProps) {
  const { state } = props;

  const [instructions, setInstructions] = useState("");

  const isActive = state === CameraHandlerState.Cinematic;

  useEffect(() => {
    if (!isActive) { return; }

    const cancelation = writeOutChars("Click anywhere to start", setInstructions, MStoWriteChar);

    return () => { cancelation(); }

  }, [state]);

  return (<>
    <div className={styles['cinematic-container']}>
      <span className={joinStyles([
        styles['cinematic-instructions'],
        !isActive ? styles['fade-out'] : null,
      ])}>{instructions}<span className={styles['blinking-cursor']}></span></span>
    </div>
  </>);
}

export function RendererUI(props: RendererUIProps) {
  const { cameraHandlerState, cameraHandler, soundService } = props;
  const soundManagement = useSoundManagement(soundService);

  // A switch statement wrapped in a function breaks the rules of hooks, but this doesn't?
  // Just looks ugly, but it works
  return (
    <div className={styles['ui']}>
      <UserInteractionButtons state={cameraHandlerState} cameraHandler={cameraHandler} sound={soundManagement} />
      <NameAndTime state={cameraHandlerState} cameraHandler={cameraHandler} sound={soundManagement} />
      <CinematicInstructions state={cameraHandlerState} sound={soundManagement} />
    </div>
  );
}