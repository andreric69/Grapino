/** Leichte, sofort verfuegbare Pruefung ob eine Kamera angesprochen werden kann - ohne die schwere Scanner-Bibliothek zu laden. */
export const HAS_CAMERA_SCANNER =
  typeof navigator !== 'undefined' && !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;
