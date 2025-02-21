import { Button } from "@/components/ui/button";
import { dispatch } from "@designcombo/events";
import {
  ACTIVE_SPLIT,
  LAYER_CLONE,
  LAYER_DELETE,
  TIMELINE_SCALE_CHANGED,
} from "@designcombo/state";
import { PLAYER_PAUSE, PLAYER_PLAY } from "@/global";
import { frameToTimeString, getCurrentTime, timeToString } from "../utils/time";
import useStore from "@/pages/editor/store/use-store";
import { SquareSplitHorizontal, Trash, ZoomIn, ZoomOut } from "lucide-react";
import {
  getFitZoomLevel,
  getNextZoomLevel,
  getPreviousZoomLevel,
  getZoomByIndex,
} from "../utils/timeline";
import { useCurrentPlayerFrame } from "@/hooks/use-current-frame";
import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
} from "@tabler/icons-react";
import { Slider } from "@/components/ui/slider";
import { useEffect, useState } from "react";
import useUpdateAnsestors from "../hooks/use-update-ansestors";
import { ITimelineScaleState } from "@designcombo/types";

const Header = () => {
  const [playing, setPlaying] = useState(false);
  const { duration, fps, scale, playerRef, activeIds } = useStore();

  useUpdateAnsestors({ playing, playerRef });

  const currentFrame = useCurrentPlayerFrame(playerRef!);

  const doActiveDelete = () => {
    dispatch(LAYER_DELETE);
  };

  const doActiveSplit = () => {
    dispatch(ACTIVE_SPLIT, {
      payload: {},
      options: {
        time: getCurrentTime(),
      },
    });
  };

  const changeScale = (scale: ITimelineScaleState) => {
    dispatch(TIMELINE_SCALE_CHANGED, {
      payload: {
        scale,
      },
    });
  };

  const handlePlay = () => {
    dispatch(PLAYER_PLAY);
  };

  const handlePause = () => {
    dispatch(PLAYER_PAUSE);
  };

  useEffect(() => {
    playerRef?.current?.addEventListener("play", () => {
      setPlaying(true);
    });
    playerRef?.current?.addEventListener("pause", () => {
      setPlaying(false);
    });
    return () => {
      playerRef?.current?.removeEventListener("play", () => {
        setPlaying(true);
      });
      playerRef?.current?.removeEventListener("pause", () => {
        setPlaying(false);
      });
    };
  }, [playerRef]);

  return (
    <div
      style={{
        position: "relative",
        height: "50px",
        flex: "none",
      }}
      className="bg-background"
    >
      <div
        style={{
          position: "absolute",
          height: 50,
          width: "100%",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            height: 36,
            width: "100%",
            display: "grid",
            gridTemplateColumns: "1fr 260px 1fr",
            alignItems: "center",
          }}
        >
          <div className="flex px-2">
            <Button
              disabled={!activeIds.length}
              onClick={doActiveDelete}
              variant={"ghost"}
              size={"sm"}
              className="flex items-center gap-1 px-2"
            >
              <Trash size={14} /> Delete
            </Button>
            {/* Split not used for blocks */}
            {/* <Button
              disabled={!activeIds.length}
              onClick={doActiveSplit}
              variant={"ghost"}
              size={"sm"}
              className="flex items-center gap-1 px-2"
            >
              <SquareSplitHorizontal size={15} /> Split
            </Button> */}
            <Button
              disabled={!activeIds.length}
              onClick={() => {
                dispatch(LAYER_CLONE);
              }}
              variant={"ghost"}
              size={"sm"}
              className="flex items-center gap-1 px-2"
            >
              <SquareSplitHorizontal size={15} /> Clone
            </Button>
          </div>
          <div className="flex items-center justify-center">
            <div>
              <Button onClick={doActiveDelete} variant={"ghost"} size={"icon"}>
                <IconPlayerSkipBack size={14} />
              </Button>
              <Button
                onClick={() => {
                  if (playing) {
                    return handlePause();
                  }
                  handlePlay();
                }}
                variant={"ghost"}
                size={"icon"}
              >
                {playing ? (
                  <IconPlayerPauseFilled size={14} />
                ) : (
                  <IconPlayerPlayFilled size={14} />
                )}
              </Button>
              <Button onClick={doActiveSplit} variant={"ghost"} size={"icon"}>
                <IconPlayerSkipForward size={14} />
              </Button>
            </div>
            <div
              className="text-xs font-light"
              style={{
                display: "grid",
                alignItems: "center",
                gridTemplateColumns: "54px 4px 54px",
                paddingTop: "2px",
                justifyContent: "center",
              }}
            >
              <div
                className="font-medium text-zinc-200"
                style={{
                  display: "flex",
                  justifyContent: "center",
                }}
                data-current-time={currentFrame / fps}
                id="video-current-time"
              >
                {frameToTimeString({ frame: currentFrame }, { fps })}
              </div>
              <span>/</span>
              <div
                className="text-muted-foreground"
                style={{
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                {timeToString({ time: duration })}
              </div>
            </div>
          </div>

          <ZoomControl
            scale={scale}
            onChangeTimelineScale={changeScale}
            duration={duration}
          />
        </div>
      </div>
    </div>
  );
};

const ZoomControl = ({
  scale,
  onChangeTimelineScale,
  duration,
}: {
  scale: ITimelineScaleState;
  onChangeTimelineScale: (scale: ITimelineScaleState) => void;
  duration: number;
}) => {
  const [localValue, setLocalValue] = useState(scale.index);

  useEffect(() => {
    setLocalValue(scale.index);
  }, [scale.index]);

  const onZoomOutClick = () => {
    const previousZoom = getPreviousZoomLevel(scale);
    onChangeTimelineScale(previousZoom);
  };

  const onZoomInClick = () => {
    const nextZoom = getNextZoomLevel(scale);
    onChangeTimelineScale(nextZoom);
  };

  const onZoomFitClick = () => {
    const fitZoom = getFitZoomLevel(duration, scale.zoom);
    onChangeTimelineScale(fitZoom);
  };

  return (
    <div className="flex items-center justify-end">
      <div className="flex border-l border-border pl-4 pr-2">
        <Button size={"icon"} variant={"ghost"} onClick={onZoomOutClick}>
          <ZoomOut size={16} />
        </Button>
        <Slider
          className="w-28"
          value={[localValue]}
          min={0}
          max={12}
          step={1}
          onValueChange={(e) => {
            setLocalValue(e[0]); // Update local state
          }}
          onValueCommit={() => {
            const zoom = getZoomByIndex(localValue);
            onChangeTimelineScale(zoom); // Propagate value to parent when user commits change
          }}
        />
        <Button size={"icon"} variant={"ghost"} onClick={onZoomInClick}>
          <ZoomIn size={16} />
        </Button>
        <Button onClick={onZoomFitClick} variant={"ghost"} size={"icon"}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M20 8V6h-2q-.425 0-.712-.288T17 5t.288-.712T18 4h2q.825 0 1.413.588T22 6v2q0 .425-.288.713T21 9t-.712-.288T20 8M2 8V6q0-.825.588-1.412T4 4h2q.425 0 .713.288T7 5t-.288.713T6 6H4v2q0 .425-.288.713T3 9t-.712-.288T2 8m18 12h-2q-.425 0-.712-.288T17 19t.288-.712T18 18h2v-2q0-.425.288-.712T21 15t.713.288T22 16v2q0 .825-.587 1.413T20 20M4 20q-.825 0-1.412-.587T2 18v-2q0-.425.288-.712T3 15t.713.288T4 16v2h2q.425 0 .713.288T7 19t-.288.713T6 20zm2-6v-4q0-.825.588-1.412T8 8h8q.825 0 1.413.588T18 10v4q0 .825-.587 1.413T16 16H8q-.825 0-1.412-.587T6 14"
            />
          </svg>
        </Button>
      </div>
    </div>
  );
};

export default Header;
