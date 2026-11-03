// Homepage scene compositions (spec §7.1).
//
// Each scene is a fixed composition, not a grid: positions come straight from
// Figma (Landing page-the vision-scroll, node 1541:64881) in px inside the
// scene box. The box scales as a whole, so the composition never reflows.
//
// Slots are listed in Figma layer order: later slots sit on top.
// `halo` is the yellow circle behind an illustration when it is selected.
// `depth` (-1 to 1) sets the scroll parallax: positive drifts up faster than the page,
// negative lags behind. Keep values small; the largest move is PARALLAX_PX in Scene.jsx.
// `priorityArea` (optional) is a polygon, in scene px, where this illustration
// always wins hover and click, even where another illustration is drawn over it.

export const SCENE_BOX = { width: 640, height: 684 };

export const scenes = [
  {
    id: 'scene-1',
    title: 'You step out of your house and here is what you notice...',
    slots: [
      // Figma "Component 2". Halo from the hover frame (1541:65568).
      { indicator: 2, depth: -0.5, x: 166.52, y: 0, width: 473.48, height: 347.82, halo: { x: 280.2, y: 0, size: 360 } },
      // Figma "Component 3". Halo not designed yet: centred estimate.
      // Priority area: the neighbours waving and raking, marked up by the designer.
      {
        indicator: 1,
        depth: 0.6,
        x: 0,
        y: 11.67,
        width: 332.26,
        height: 308.52,
        halo: { x: -4, y: -4, size: 340 },
        priorityArea: [
          [23, 43], [114, 0], [230, 13], [301, 43], [321, 109], [316, 260],
          [276, 281], [149, 271], [23, 271], [0, 240], [0, 109],
        ],
      },
      // Figma "Component 4". Halo from the selected frame (1541:66189), scaled from 560px.
      // Priority area: the repair workshop doorway, marked up by the designer.
      {
        indicator: 3,
        depth: -0.4,
        x: 0,
        y: 303.46,
        width: 253.67,
        height: 251.33,
        halo: { x: 0, y: 274.3, size: 297 },
        priorityArea: [[3, 296], [238, 306], [230, 534], [210, 554], [0, 551], [0, 311]],
      },
      // Figma "Component 5". Halo not designed yet: centred on the drawn content.
      { indicator: 4, depth: 0.3, x: 157.18, y: 343.93, width: 394.12, height: 283.23, halo: { x: 198.5, y: 332.5, size: 311 } },
      // Figma "Component 6". Halo not designed yet: centred estimate.
      // Priority area: the children playing by the planters, marked up by the designer.
      {
        indicator: 5,
        depth: 0.8,
        x: 350.15,
        y: 393.73,
        width: 289.85,
        height: 290.24,
        halo: { x: 336, y: 379, size: 319 },
        priorityArea: [
          [569, 422], [640, 443], [640, 513], [640, 640], [554, 660], [402, 660],
          [362, 635], [392, 594], [453, 518], [513, 463],
        ],
      },
    ],
  },
];
