import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { StudioElementView, type ElementBound } from '@/components/studio/StudioElementView';
import { studioPulse } from '@/components/studio/studio-haptic';
import {
  clampRange,
  hitTestElements,
  nextAnchor,
  toLocalPoint,
} from '@/components/studio/studio-geometry';
import { Fonts } from '@/constants/theme';
import type { StudioElement, StudioTextAlign } from '@/types/studio';

const MIN_ELEMENT_SCALE = 0.4;
const MAX_ELEMENT_SCALE = 4;
const MIN_PHOTO_SCALE = 1;
const MAX_PHOTO_SCALE = 4;
const EDGE = 0.08;
const ZOOM_IN = 2.2;
const TRASH_SIZE = 64;
const TRASH_BOTTOM = 28;
const TRASH_HIT_RADIUS = 96;

function stagePoint(
  localX: number,
  localY: number,
  originX: number,
  originY: number,
  width: number,
  height: number,
  scale: number,
  translateX: number,
  translateY: number,
) {
  'worklet';
  const zoom = scale || 1;
  const centerX = width / 2;
  const centerY = height / 2;
  return {
    x: originX + centerX + (localX - centerX) * zoom + translateX,
    y: originY + centerY + (localY - centerY) * zoom + translateY,
  };
}

function coversTrash(x: number, y: number, width: number, height: number) {
  'worklet';
  const dx = x - width / 2;
  const dy = y - (height - TRASH_BOTTOM - TRASH_SIZE / 2);
  return dx * dx + dy * dy <= TRASH_HIT_RADIUS * TRASH_HIT_RADIUS;
}

export type StudioComposeDraft = {
  elementId: string | null;
  mode: 'text' | 'emoji';
  content: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  align: StudioTextAlign;
  background: boolean;
};

export type StudioElementCommit = {
  id: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export type StudioCanvasHandle = {
  visibleCenter: () => { x: number; y: number };
};

type PhotoFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type StudioCanvasProps = {
  uri: string;
  stageWidth: number;
  stageHeight: number;
  frame: PhotoFrame;
  elements: StudioElement[];
  selectedId: string | null;
  previewing: boolean;
  compose: StudioComposeDraft | null;
  onComposeChange: (content: string) => void;
  onSelect: (id: string) => void;
  onGrab: (id: string) => void;
  onEdit: (id: string) => void;
  onBlankTap: (x: number, y: number) => void;
  onCommit: (next: StudioElementCommit) => void;
  onDelete: (id: string) => void;
  onComposeOutside: () => void;
  onGestureEnd: () => void;
  onNaturalSize: (width: number, height: number) => void;
  viewportHeight: number;
  inputInset: number;
};

export const StudioCanvas = forwardRef<StudioCanvasHandle, StudioCanvasProps>(function StudioCanvas(
  {
    uri,
    stageWidth,
    stageHeight,
    frame,
    elements,
    selectedId,
    previewing,
    compose,
    onComposeChange,
    onSelect,
    onGrab,
    onEdit,
    onBlankTap,
    onCommit,
    onDelete,
    onComposeOutside,
    onGestureEnd,
    onNaturalSize,
    viewportHeight,
    inputInset,
  },
  ref,
) {
  const bounds = useSharedValue<ElementBound[]>(initialBounds(elements, frame.width, frame.height));
  const frameX = useSharedValue(frame.x);
  const frameY = useSharedValue(frame.y);
  const frameW = useSharedValue(frame.width);
  const frameH = useSharedValue(frame.height);
  const photoScale = useSharedValue(1);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const mode = useSharedValue<'none' | 'element' | 'photo'>('none');
  const activeIndex = useSharedValue(-1);
  const savedScale = useSharedValue(1);
  const savedRotation = useSharedValue(0);
  const savedPhotoScale = useSharedValue(1);
  const lastPanX = useSharedValue(0);
  const lastPanY = useSharedValue(0);
  const gestureCount = useSharedValue(0);
  const changed = useSharedValue(false);
  const panActive = useSharedValue(false);
  const pinchActive = useSharedValue(false);
  const rotationActive = useSharedValue(false);
  const anchorX = useSharedValue(0);
  const anchorY = useSharedValue(0);
  const anchorLocked = useSharedValue(false);
  const moved = useSharedValue(false);
  const lastPointers = useSharedValue(0);
  const draggingTrash = useSharedValue(false);
  const overTrash = useSharedValue(false);
  const trashShown = useSharedValue(0);
  const trashHot = useSharedValue(0);
  const suppressDelete = useSharedValue(false);
  const stageW = useSharedValue(stageWidth);
  const stageH = useSharedValue(stageHeight);
  const selectedSv = useSharedValue<string | null>(selectedId);
  const previewSv = useSharedValue(previewing);
  const composingSv = useSharedValue(compose !== null);
  const inputAnchor = useSharedValue({
    x: 0.5,
    y: 0.5,
    fontSize: 32,
    frameX: frame.x,
    frameY: frame.y,
    frameW: frame.width,
    frameH: frame.height,
    stageW: stageWidth,
    stageH: stageHeight,
    visibleH: viewportHeight,
    fieldH: 0,
    minTop: inputInset,
  });
  const [fieldHeight, setFieldHeight] = useState(0);
  const fieldRef = useRef<TextInput>(null);
  const callbacks = useRef({ onSelect, onGrab, onEdit, onBlankTap, onCommit, onDelete, onGestureEnd });
  callbacks.current = { onSelect, onGrab, onEdit, onBlankTap, onCommit, onDelete, onGestureEnd };

  const writing = compose !== null;

  useEffect(() => {
    stageW.value = stageWidth;
    stageH.value = stageHeight;
  }, [stageH, stageHeight, stageW, stageWidth]);

  useEffect(() => {
    frameX.value = frame.x;
    frameY.value = frame.y;
    frameW.value = frame.width;
    frameH.value = frame.height;
    clampPhoto(panX, panY, photoScale, frame.width, frame.height);
  }, [frame.x, frame.y, frame.height, frame.width, frameH, frameW, frameX, frameY, panX, panY, photoScale]);

  useEffect(() => {
    selectedSv.value = selectedId;
  }, [selectedId, selectedSv]);

  useEffect(() => {
    previewSv.value = previewing;
  }, [previewSv, previewing]);

  useEffect(() => {
    composingSv.value = writing;
  }, [composingSv, writing]);

  useEffect(() => {
    setFieldHeight(0);
  }, [compose?.elementId, compose?.mode, writing]);

  useEffect(() => {
    if (!writing) {
      return undefined;
    }
    const handle = requestAnimationFrame(() => {
      fieldRef.current?.focus();
    });
    return () => cancelAnimationFrame(handle);
  }, [compose?.elementId, compose?.mode, writing]);

  useEffect(() => {
    mode.value = 'none';
    gestureCount.value = 0;
    anchorLocked.value = false;
    moved.value = false;
    panActive.value = false;
    pinchActive.value = false;
    rotationActive.value = false;
    changed.value = false;
    draggingTrash.value = false;
    overTrash.value = false;
    trashShown.value = 0;
    trashHot.value = 0;
    suppressDelete.value = false;
  }, [
    anchorLocked,
    changed,
    draggingTrash,
    gestureCount,
    mode,
    moved,
    overTrash,
    panActive,
    pinchActive,
    rotationActive,
    suppressDelete,
    trashHot,
    trashShown,
    writing,
  ]);

  useLayoutEffect(() => {
    inputAnchor.value = {
      x: compose?.x ?? 0.5,
      y: compose?.y ?? 0.5,
      fontSize: compose?.fontSize ?? 32,
      frameX: frame.x,
      frameY: frame.y,
      frameW: frame.width,
      frameH: frame.height,
      stageW: stageWidth,
      stageH: stageHeight,
      visibleH: viewportHeight,
      fieldH: fieldHeight,
      minTop: inputInset,
    };
  }, [
    compose?.fontSize,
    compose?.x,
    compose?.y,
    fieldHeight,
    frame.height,
    frame.width,
    frame.x,
    frame.y,
    inputAnchor,
    inputInset,
    stageHeight,
    stageWidth,
    viewportHeight,
  ]);

  useLayoutEffect(() => {
    const previous = bounds.value;
    const gesturing = gestureCount.value > 0;
    bounds.value = elements.map((element) => {
      const old = previous.find((entry) => entry.id === element.id);
      if (gesturing && old) {
        return { ...old, z: element.zIndex };
      }
      return {
        id: element.id,
        cx: element.x * frame.width,
        cy: element.y * frame.height,
        boxW: old?.boxW ?? 0,
        boxH: old?.boxH ?? 0,
        scale: element.scale,
        rotation: element.rotation,
        z: element.zIndex,
      };
    });
  }, [bounds, elements, frame.height, frame.width, gestureCount]);

  useImperativeHandle(ref, () => ({
    visibleCenter: () => {
      const width = frameW.value || 1;
      const height = frameH.value || 1;
      const local = toLocalPoint(width / 2, height / 2, width, height, photoScale.value, panX.value, panY.value);
      return {
        x: clampRange(local.x / width, EDGE, 1 - EDGE),
        y: clampRange(local.y / height, EDGE, 1 - EDGE),
      };
    },
  }));

  const updateBox = useCallback(
    (id: string, boxW: number, boxH: number) => {
      const current = bounds.value.find((entry) => entry.id === id);
      if (gestureCount.value > 0 && current && current.boxW > 0 && current.boxH > 0) {
        return;
      }
      if (!current) {
        return;
      }
      if (
        current &&
        Math.abs(current.boxW - boxW) < 0.5 &&
        Math.abs(current.boxH - boxH) < 0.5
      ) {
        return;
      }
      bounds.value = bounds.value.map((entry) =>
        entry.id === id ? { ...entry, boxW, boxH } : entry,
      );
    },
    [bounds, gestureCount],
  );

  const selectJs = useCallback((id: string) => {
    callbacks.current.onSelect(id);
  }, []);
  const grabJs = useCallback((id: string) => {
    callbacks.current.onGrab(id);
  }, []);
  const editJs = useCallback((id: string) => {
    callbacks.current.onEdit(id);
  }, []);
  const blankJs = useCallback((x: number, y: number) => {
    callbacks.current.onBlankTap(x, y);
  }, []);
  const commitJs = useCallback((next: StudioElementCommit) => {
    callbacks.current.onCommit(next);
  }, []);
  const deleteJs = useCallback((id: string) => {
    callbacks.current.onDelete(id);
  }, []);
  const endJs = useCallback(() => {
    callbacks.current.onGestureEnd();
  }, []);
  const pulseJs = useCallback((kind: 'grab' | 'trash') => {
    studioPulse(kind);
  }, []);

  const gesture = useMemo(() => {
    const claim = (x: number, y: number) => {
      'worklet';
      if (mode.value !== 'none' || composingSv.value) {
        return;
      }
      const width = frameW.value;
      const height = frameH.value;
      if (width <= 0 || height <= 0) {
        return;
      }
      const local = toLocalPoint(
        x - frameX.value,
        y - frameY.value,
        width,
        height,
        photoScale.value,
        panX.value,
        panY.value,
      );
      const index = previewSv.value ? -1 : hitTestElements(bounds.value, local.x, local.y);
      activeIndex.value = index;
      if (index >= 0) {
        mode.value = 'element';
        const item = bounds.value[index];
        savedScale.value = item?.scale ?? 1;
        savedRotation.value = item?.rotation ?? 0;
        if (item) {
          runOnJS(grabJs)(item.id);
        }
        return;
      }
      mode.value = 'photo';
      savedPhotoScale.value = photoScale.value;
    };

    const markBegan = (flag: SharedValue<boolean>) => {
      'worklet';
      if (flag.value) {
        return;
      }
      flag.value = true;
      gestureCount.value += 1;
    };

    const markEnded = (flag: SharedValue<boolean>) => {
      'worklet';
      if (!flag.value) {
        return;
      }
      flag.value = false;
      gestureCount.value = Math.max(0, gestureCount.value - 1);
      if (gestureCount.value > 0) {
        return;
      }
      const currentMode = mode.value;
      const index = activeIndex.value;
      mode.value = 'none';
      anchorLocked.value = false;
      const dropInTrash = overTrash.value && !suppressDelete.value && !previewSv.value;
      draggingTrash.value = false;
      overTrash.value = false;
      suppressDelete.value = false;
      trashShown.value = withTiming(0, { duration: 140 });
      trashHot.value = withTiming(0, { duration: 120 });
      if (currentMode === 'element' && index >= 0) {
        const item = bounds.value[index];
        const width = frameW.value || 1;
        const height = frameH.value || 1;
        if (item && dropInTrash) {
          runOnJS(deleteJs)(item.id);
        } else if (item && changed.value) {
          runOnJS(commitJs)({
            id: item.id,
            x: item.cx / width,
            y: item.cy / height,
            scale: item.scale,
            rotation: item.rotation,
          });
        }
      }
      if (
        currentMode === 'photo' &&
        photoScale.value <= 1.02 &&
        (photoScale.value !== 1 || panX.value !== 0 || panY.value !== 0)
      ) {
        photoScale.value = withTiming(MIN_PHOTO_SCALE, { duration: 220 });
        panX.value = withTiming(0, { duration: 220 });
        panY.value = withTiming(0, { duration: 220 });
      }
      changed.value = false;
      runOnJS(endJs)();
    };

    const noteTouches = (allTouches: readonly { x: number; y: number }[], numberOfTouches: number) => {
      'worklet';
      const touchCount = allTouches.length > 0 ? allTouches.length : numberOfTouches;
      if (touchCount === 1 && gestureCount.value === 0 && mode.value !== 'none') {
        mode.value = 'none';
        anchorLocked.value = false;
      }
      if (!nextAnchor(mode.value !== 'none', anchorLocked.value, touchCount)) {
        return;
      }
      const touch = allTouches[0];
      if (!touch) {
        return;
      }
      anchorX.value = touch.x;
      anchorY.value = touch.y;
      anchorLocked.value = true;
      moved.value = false;
      if (touchCount === 1) {
        suppressDelete.value = false;
        overTrash.value = false;
        draggingTrash.value = false;
      }
    };

    const noteLift = (allTouches: readonly { x: number; y: number }[], numberOfTouches: number) => {
      'worklet';
      if (mode.value === 'none' && (numberOfTouches === 0 || allTouches.length === 0)) {
        anchorLocked.value = false;
      }
    };

    const beginGesture = (flag: SharedValue<boolean>) => {
      'worklet';
      if (mode.value === 'none') {
        claim(anchorX.value, anchorY.value);
      }
      markBegan(flag);
    };

    const pan = Gesture.Pan()
      .enabled(!writing)
      .minDistance(12)
      .onTouchesDown((event) => {
        noteTouches(event.allTouches, event.numberOfTouches);
      })
      .onTouchesUp((event) => {
        noteLift(event.allTouches, event.numberOfTouches);
      })
      .onBegin(() => {
        lastPanX.value = 0;
        lastPanY.value = 0;
        lastPointers.value = 0;
      })
      .onStart(() => {
        beginGesture(panActive);
        moved.value = true;
        if (mode.value === 'element' && !previewSv.value) {
          draggingTrash.value = true;
          trashShown.value = withTiming(1, { duration: 160 });
          runOnJS(pulseJs)('grab');
        } else {
          draggingTrash.value = false;
        }
      })
      .onUpdate((event) => {
        if (event.numberOfPointers !== lastPointers.value) {
          lastPointers.value = event.numberOfPointers;
          lastPanX.value = event.translationX;
          lastPanY.value = event.translationY;
          return;
        }
        const dx = event.translationX - lastPanX.value;
        const dy = event.translationY - lastPanY.value;
        lastPanX.value = event.translationX;
        lastPanY.value = event.translationY;
        if (event.numberOfPointers !== 1) {
          draggingTrash.value = false;
          overTrash.value = false;
          suppressDelete.value = true;
          trashShown.value = withTiming(0, { duration: 120 });
          trashHot.value = withTiming(0, { duration: 120 });
          return;
        }
        const width = frameW.value;
        const height = frameH.value;
        if (mode.value === 'element') {
          const index = activeIndex.value;
          const item = bounds.value[index];
          if (!item || width <= 0 || height <= 0) {
            return;
          }
          const zoom = photoScale.value || 1;
          const next = bounds.value.slice();
          next[index] = {
            ...item,
            cx: clampRange(item.cx + dx / zoom, width * EDGE, width * (1 - EDGE)),
            cy: clampRange(item.cy + dy / zoom, height * EDGE, height * (1 - EDGE)),
          };
          bounds.value = next;
          changed.value = true;
          const placed = next[index];
          if (placed && !suppressDelete.value && !previewSv.value) {
            const point = stagePoint(
              placed.cx,
              placed.cy,
              frameX.value,
              frameY.value,
              width,
              height,
              zoom,
              panX.value,
              panY.value,
            );
            const nextOver = coversTrash(point.x, point.y, stageW.value, stageH.value);
            if (nextOver !== overTrash.value) {
              overTrash.value = nextOver;
              trashHot.value = withTiming(nextOver ? 1 : 0, { duration: 140 });
              if (nextOver) {
                runOnJS(pulseJs)('trash');
              }
            }
            draggingTrash.value = true;
            if (trashShown.value === 0) {
              trashShown.value = withTiming(1, { duration: 160 });
            }
          }
          return;
        }
        if (mode.value === 'photo' && photoScale.value > 1.01) {
          panX.value += dx;
          panY.value += dy;
          clampPhoto(panX, panY, photoScale, width, height);
          changed.value = true;
        }
      })
      .onFinalize(() => {
        markEnded(panActive);
      });

    const pinch = Gesture.Pinch()
      .enabled(!writing)
      .onTouchesDown((event) => {
        noteTouches(event.allTouches, event.numberOfTouches);
      })
      .onTouchesUp((event) => {
        noteLift(event.allTouches, event.numberOfTouches);
      })
      .onStart(() => {
        beginGesture(pinchActive);
        moved.value = true;
        suppressDelete.value = true;
        draggingTrash.value = false;
        overTrash.value = false;
        trashShown.value = withTiming(0, { duration: 120 });
        trashHot.value = withTiming(0, { duration: 120 });
        if (mode.value === 'element') {
          const item = bounds.value[activeIndex.value];
          if (item) {
            savedScale.value = item.scale;
          }
        } else if (mode.value === 'photo') {
          savedPhotoScale.value = photoScale.value;
        }
      })
      .onUpdate((event) => {
        if (mode.value === 'element') {
          const index = activeIndex.value;
          const item = bounds.value[index];
          if (!item) {
            return;
          }
          const next = bounds.value.slice();
          next[index] = {
            ...item,
            scale: clampRange(savedScale.value * event.scale, MIN_ELEMENT_SCALE, MAX_ELEMENT_SCALE),
          };
          bounds.value = next;
          changed.value = true;
          return;
        }
        if (mode.value === 'photo') {
          photoScale.value = clampRange(
            savedPhotoScale.value * event.scale,
            MIN_PHOTO_SCALE,
            MAX_PHOTO_SCALE,
          );
          clampPhoto(panX, panY, photoScale, frameW.value, frameH.value);
          changed.value = true;
        }
      })
      .onFinalize(() => {
        markEnded(pinchActive);
      });

    const rotation = Gesture.Rotation()
      .enabled(!writing)
      .onTouchesDown((event) => {
        noteTouches(event.allTouches, event.numberOfTouches);
      })
      .onTouchesUp((event) => {
        noteLift(event.allTouches, event.numberOfTouches);
      })
      .onStart(() => {
        beginGesture(rotationActive);
        moved.value = true;
        suppressDelete.value = true;
        draggingTrash.value = false;
        overTrash.value = false;
        trashShown.value = withTiming(0, { duration: 120 });
        trashHot.value = withTiming(0, { duration: 120 });
        if (mode.value === 'element') {
          const item = bounds.value[activeIndex.value];
          if (item) {
            savedRotation.value = item.rotation;
          }
        }
      })
      .onUpdate((event) => {
        if (mode.value !== 'element') {
          return;
        }
        const index = activeIndex.value;
        const item = bounds.value[index];
        if (!item) {
          return;
        }
        const next = bounds.value.slice();
        next[index] = {
          ...item,
          rotation: savedRotation.value + (event.rotation * 180) / Math.PI,
        };
        bounds.value = next;
        changed.value = true;
      })
      .onFinalize(() => {
        markEnded(rotationActive);
      });

    const doubleTap = Gesture.Tap()
      .enabled(!writing)
      .numberOfTaps(2)
      .maxDelay(280)
      .maxDistance(24)
      .onEnd((event) => {
        if (composingSv.value || frameW.value <= 0) {
          return;
        }
        const local = toLocalPoint(
          event.x - frameX.value,
          event.y - frameY.value,
          frameW.value,
          frameH.value,
          photoScale.value,
          panX.value,
          panY.value,
        );
        if (!previewSv.value && hitTestElements(bounds.value, local.x, local.y) >= 0) {
          return;
        }
        if (photoScale.value > 1.05) {
          photoScale.value = withTiming(MIN_PHOTO_SCALE, { duration: 220 });
          panX.value = withTiming(0, { duration: 220 });
          panY.value = withTiming(0, { duration: 220 });
          return;
        }
        photoScale.value = withTiming(ZOOM_IN, { duration: 220 });
        panX.value = withTiming(0, { duration: 220 });
        panY.value = withTiming(0, { duration: 220 });
      });

    const singleTap = Gesture.Tap()
      .enabled(!writing)
      .numberOfTaps(1)
      .maxDuration(500)
      .maxDistance(18)
      .onEnd((event) => {
        if (composingSv.value || previewSv.value || moved.value || frameW.value <= 0) {
          return;
        }
        const width = frameW.value;
        const height = frameH.value;
        const local = toLocalPoint(
          event.x - frameX.value,
          event.y - frameY.value,
          width,
          height,
          photoScale.value,
          panX.value,
          panY.value,
        );
        const index = hitTestElements(bounds.value, local.x, local.y);
        if (index >= 0) {
          const item = bounds.value[index];
          if (!item) {
            return;
          }
          if (item.id === selectedSv.value) {
            runOnJS(editJs)(item.id);
          } else {
            runOnJS(selectJs)(item.id);
          }
          return;
        }
        if (local.x < 0 || local.y < 0 || local.x > width || local.y > height) {
          return;
        }
        const center = toLocalPoint(width / 2, height / 2, width, height, photoScale.value, panX.value, panY.value);
        runOnJS(blankJs)(
          clampRange(center.x / width, EDGE, 1 - EDGE),
          clampRange(center.y / height, EDGE, 1 - EDGE),
        );
      });

    return Gesture.Simultaneous(pan, pinch, rotation, Gesture.Exclusive(doubleTap, singleTap));
  }, [
    activeIndex,
    anchorLocked,
    anchorX,
    anchorY,
    blankJs,
    bounds,
    changed,
    commitJs,
    composingSv,
    deleteJs,
    draggingTrash,
    editJs,
    endJs,
    frameH,
    frameW,
    frameX,
    frameY,
    gestureCount,
    grabJs,
    lastPanX,
    lastPanY,
    lastPointers,
    mode,
    moved,
    panActive,
    panX,
    panY,
    photoScale,
    pinchActive,
    overTrash,
    previewSv,
    pulseJs,
    rotationActive,
    savedPhotoScale,
    savedRotation,
    savedScale,
    selectJs,
    stageH,
    stageW,
    suppressDelete,
    trashHot,
    trashShown,
    selectedSv,
    writing,
  ]);

  const trashStyle = useAnimatedStyle(() => ({
    opacity: trashShown.value,
    backgroundColor: interpolateColor(
      trashHot.value,
      [0, 1],
      ['rgba(11,14,16,0.78)', '#E23B3B'],
    ),
    transform: [{ scale: 1 + trashHot.value * 0.16 }],
  }));

  const photoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value },
      { translateY: panY.value },
      { scale: photoScale.value },
    ],
  }));

  const inputStyle = useAnimatedStyle(() => {
    const anchor = inputAnchor.value;
    const zoom = photoScale.value || 1;
    const localX = anchor.x * anchor.frameW;
    const localY = anchor.y * anchor.frameH;
    const centerX = anchor.frameW / 2;
    const centerY = anchor.frameH / 2;
    const screenX = anchor.frameX + centerX + (localX - centerX) * zoom + panX.value;
    const screenY = anchor.frameY + centerY + (localY - centerY) * zoom + panY.value;
    const width = Math.min(Math.max(anchor.frameW * 0.86, 120), Math.max(anchor.stageW - 16, 120));
    const visibleH = anchor.visibleH > 0 ? anchor.visibleH : anchor.stageH;
    const cap = Math.max(anchor.fontSize * 1.4, visibleH - anchor.minTop - 12);
    const fieldH = Math.min(Math.max(anchor.fieldH, anchor.fontSize * 1.4), cap);
    const maxTop = Math.max(anchor.minTop, visibleH - fieldH - 8);
    return {
      width,
      left: clampRange(screenX - width / 2, 8, Math.max(8, anchor.stageW - width - 8)),
      top: clampRange(screenY - fieldH / 2, anchor.minTop, maxTop),
    };
  });

  return (
    <View style={{ width: stageWidth, height: stageHeight, flexShrink: 0, zIndex: 1 }}>
      <GestureDetector gesture={gesture}>
        <Animated.View
          collapsable={false}
          pointerEvents={writing ? 'none' : 'auto'}
          style={StyleSheet.absoluteFill}
        >
          <Animated.View
            collapsable={false}
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: frame.x,
                top: frame.y,
                width: frame.width,
                height: frame.height,
              },
              photoStyle,
            ]}
          >
            <Image
              source={{ uri }}
              style={StyleSheet.absoluteFill}
              contentFit="fill"
              accessibilityLabel="Fotografia do Studio"
              onLoad={(event) => {
                const width = event.source?.width ?? 0;
                const height = event.source?.height ?? 0;
                if (width > 0 && height > 0) {
                  onNaturalSize(width, height);
                }
              }}
            />
            {elements.map((element) =>
              compose?.elementId === element.id ? null : (
                <StudioElementView
                  key={element.id}
                  element={element}
                  photoWidth={frame.width}
                  photoHeight={frame.height}
                  bounds={bounds}
                  selected={element.id === selectedId && !previewing && !writing}
                  onBox={updateBox}
                />
              ),
            )}
          </Animated.View>
        </Animated.View>
      </GestureDetector>
      <View pointerEvents="none" style={styles.trashSlot}>
        <Animated.View style={[styles.trash, trashStyle]}>
          <SymbolView name={trashIcon} size={28} tintColor="#F4F6F6" />
        </Animated.View>
      </View>
      {compose ? (
        <Pressable
          style={styles.dismissLayer}
          onPress={onComposeOutside}
          accessibilityRole="button"
          accessibilityLabel="Confirmar texto"
        />
      ) : null}
      {compose ? (
        <Animated.View collapsable={false} pointerEvents="box-none" style={[styles.inputAnchor, inputStyle]}>
          <TextInput
            ref={fieldRef}
            value={compose.content}
            onChangeText={onComposeChange}
            autoFocus
            multiline
            scrollEnabled
            blurOnSubmit={false}
            onContentSizeChange={(event) => {
              const next = Math.ceil(event.nativeEvent.contentSize.height);
              setFieldHeight((current) => (current === next ? current : next));
            }}
            selectionColor="#FFFFFF"
            underlineColorAndroid="transparent"
            placeholder={compose.mode === 'emoji' ? 'Emoji' : ''}
            placeholderTextColor="rgba(244,246,246,0.45)"
            maxLength={compose.mode === 'emoji' ? 32 : 280}
            textAlign={compose.align}
            textAlignVertical="center"
            accessibilityLabel={compose.mode === 'emoji' ? 'Emojis' : 'Texto sobre a fotografia'}
            style={{
              color: compose.color,
              fontSize: compose.fontSize,
              lineHeight: Math.round(compose.fontSize * 1.25),
              fontFamily: Fonts.sans,
              textAlign: compose.align,
              backgroundColor: compose.background ? 'rgba(0,0,0,0.45)' : 'transparent',
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 4,
              minHeight: Math.round(compose.fontSize * 1.4),
              maxHeight: Math.max(48, viewportHeight - inputInset - 12),
            }}
          />
        </Animated.View>
      ) : null}
    </View>
  );
});

function initialBounds(elements: StudioElement[], width: number, height: number): ElementBound[] {
  return elements.map((element) => ({
    id: element.id,
    cx: element.x * width,
    cy: element.y * height,
    boxW: 0,
    boxH: 0,
    scale: element.scale,
    rotation: element.rotation,
    z: element.zIndex,
  }));
}

function clampPhoto(
  translateX: SharedValue<number>,
  translateY: SharedValue<number>,
  scale: SharedValue<number>,
  width: number,
  height: number,
) {
  'worklet';
  const maxX = Math.max(0, ((scale.value - 1) * width) / 2);
  const maxY = Math.max(0, ((scale.value - 1) * height) / 2);
  translateX.value = Math.min(Math.max(translateX.value, -maxX), maxX);
  translateY.value = Math.min(Math.max(translateY.value, -maxY), maxY);
}

const trashIcon: SymbolViewProps['name'] = {
  ios: 'trash',
  android: 'delete',
  web: 'delete',
};

const styles = StyleSheet.create({
  inputAnchor: {
    position: 'absolute',
    zIndex: 4,
  },
  dismissLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 3,
  },
  trashSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: TRASH_BOTTOM,
    height: TRASH_SIZE,
    alignItems: 'center',
    zIndex: 6,
  },
  trash: {
    width: TRASH_SIZE,
    height: TRASH_SIZE,
    borderRadius: TRASH_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
