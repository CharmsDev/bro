/**
 * Stylelint configuration for the webapp
 * - Extends standard rules
 * - Enforces a simple property order
 * - Allows project CSS variables and unknown at-rules used by tooling
 */
module.exports = {
  extends: [
    "stylelint-config-standard"
  ],
  plugins: [
    "stylelint-order"
  ],
  rules: {
    // General
    "no-empty-source": null,
    "color-hex-length": "short",

    // Allow unknown at-rules that tools may inject
    "at-rule-no-unknown": [true, {
      ignoreAtRules: [
        "layer", // CSS Layers (supported in modern browsers)
      ]
    }],

    // Allow custom properties used as design tokens
    "property-no-unknown": [true, {
      ignoreProperties: [/^--/]
    }],

    // Ordering (keep it simple and readable)
    "order/properties-order": [
      [
        // Positioning
        "position", "top", "right", "bottom", "left", "z-index",
        // Display & box model
        "display", "flex", "flex-direction", "flex-wrap", "flex-flow", "flex-grow", "flex-shrink", "flex-basis", "grid", "grid-template", "grid-template-columns", "grid-template-rows", "grid-area", "grid-auto-flow", "grid-auto-columns", "grid-auto-rows", "align-items", "justify-content", "place-items", "gap",
        "box-sizing", "width", "min-width", "max-width", "height", "min-height", "max-height",
        "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
        "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
        // Typography
        "font", "font-family", "font-size", "font-weight", "line-height", "letter-spacing", "text-align", "text-decoration", "text-transform",
        // Visual
        "color", "background", "background-color", "background-image", "background-size", "background-position", "background-repeat",
        "border", "border-top", "border-right", "border-bottom", "border-left", "border-radius",
        "box-shadow", "opacity",
        // Transforms & transitions
        "transform", "transition",
        // Effects & misc
        "overflow", "cursor", "pointer-events",
      ],
      {
        unspecified: "bottomAlphabetical"
      }
    ],
  }
};
