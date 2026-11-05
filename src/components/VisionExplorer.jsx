// VisionExplorer (spec §7.1)
//
// Owns the homepage's shared state, the selected (current) indicator and the hovered
// one, so the scenes and the wheels always agree.
//
// The whole page is one long scroll: each scene is a SceneStory, where scrolling moves
// the scene aside, brings its wheel in and steps through its indicators, then carries on
// down the page. Scrolling back up runs it all in reverse.

import { useCallback, useMemo, useRef, useState } from 'react';
import data from '../data/indicators.json';
import { scenes } from '../config/scenes.js';
import SceneStory from './SceneStory.jsx';

export default function VisionExplorer() {
  // Illustration paths in the data are relative to the site root; BASE_URL makes them
  // work wherever the site is hosted (e.g. /thriving-streets/ on GitHub Pages).
  const indicatorsByNumber = useMemo(
    () =>
      new Map(
        data.indicators.map((i) => [
          i.number,
          {
            ...i,
            illustration: import.meta.env.BASE_URL + i.illustration,
            illustrationFaded: import.meta.env.BASE_URL + i.illustrationFaded,
          },
        ]),
      ),
    [],
  );
  // Indicators that are placed in a scene, in the order the page scrolls through them.
  const order = useMemo(() => scenes.flatMap((s) => s.slots.map((slot) => slot.indicator).sort((a, b) => a - b)), []);

  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const stories = useRef(new Map()); // scene id → its SceneStory (to scroll to an indicator)

  // Each story says which of its indicators is current while it holds the stage (or null).
  const onActive = useCallback((sceneId, number) => {
    const mine = new Set(scenes.find((s) => s.id === sceneId).slots.map((slot) => slot.indicator));
    setSelected((current) => (number !== null ? number : mine.has(current) ? null : current));
    setHovered(null);
  }, []);

  // The wheel's arrows, once every theme has been shown: scroll to the previous / next indicator.
  const canStep = useCallback((number, offset) => order[order.indexOf(number) + offset] !== undefined, [order]);
  const onStep = useCallback(
    (number, offset) => {
      const next = order[order.indexOf(number) + offset];
      if (next === undefined) return;
      for (const story of stories.current.values()) if (story?.indicators.includes(next)) story.scrollTo(next);
    },
    [order],
  );

  return (
    <div>
      {scenes.map((scene, i) => (
        <div key={scene.id} id={scene.id}>
          <SceneStory
            ref={(story) => stories.current.set(scene.id, story)}
            scene={scene}
            eager={i === 0}
            indicatorsByNumber={indicatorsByNumber}
            selected={selected}
            hovered={hovered}
            onHover={setHovered}
            onActive={onActive}
            onStep={onStep}
            canStep={canStep}
          />
        </div>
      ))}
    </div>
  );
}
