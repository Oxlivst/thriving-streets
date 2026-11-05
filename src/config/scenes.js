// Homepage scene compositions (spec §7.1).
//
// Each scene is a fixed composition, not a grid: positions come straight from
// Figma (Landing page-the vision-scroll, node 1541:64881) in px inside the
// scene box. The box scales as a whole, so the composition never reflows.
//
// Slots are listed in drawing order: later slots sit on top (and win hover where
// rectangles overlap). Mostly Figma layer order, except where noted.
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
      // Figma "Component 5". Halo not designed yet: centred on the drawn content.
      { indicator: 4, depth: 0.3, x: 157.18, y: 343.93, width: 394.12, height: 283.23, halo: { x: 198.5, y: 332.5, size: 311 } },
      // Figma "Component 4". Drawn above indicator 4 (designer's request). Halo from the selected frame (1541:66189), scaled from 560px.
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
  {
    // Figma: Scene 2 (file BWfZznPABe6QYhxxBGhOdp, node 6973:6044), drawn 533px wide there:
    // positions are scaled up by 640 / 533.17 to the scene box. Halos not designed yet: each is
    // centred on its drawing, 1.1 × its shorter side (as the scene 1 estimates are).
    // Figma's layers "Indicator-10" and "Indicator-11" hold the "20" sign and the gathering
    // respectively; here they follow the indicator texts (10: people of all ages and backgrounds
    // together in public space; 11: feeling safe getting around), so 10 is the gathering.
    id: 'scene-2',
    title: 'Going down the street, you observe:',
    slots: [
      { indicator: 7, depth: -0.4, x: 212.56, y: 0, width: 333.59, height: 200.88, halo: { x: 269, y: -10, size: 221 } },
      { indicator: 8, depth: 0.5, x: 340.3, y: 175.61, width: 225.89, height: 164.98, halo: { x: 363, y: 168, size: 181 } },
      { indicator: 6, depth: 0.3, x: 59.19, y: 109.85, width: 284.78, height: 230.32, halo: { x: 75, y: 99, size: 253 } },
      { indicator: 9, depth: -0.5, x: 0, y: 323.66, width: 399.74, height: 216.21, halo: { x: 81, y: 313, size: 238 } },
      { indicator: 10, depth: 0.6, x: 266.48, y: 290.49, width: 373.52, height: 283.17, halo: { x: 298, y: 277, size: 311 } },
      { indicator: 11, depth: 0.8, x: 138.04, y: 487.34, width: 230.32, height: 154.49, halo: { x: 168, y: 480, size: 170 } },
    ],
  },
];
