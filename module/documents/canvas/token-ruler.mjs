/**
 * A subclass of the token ruler class that will eventually be responsible for
 * - subtracting AP equal to one fifth of the distance after a token moves.
 * - preventing token movement when it is not the token's combatant's turn or if they cannot afford the movement.
 * - showing the AP cost as a label on the ruler and each waypoint.
 * With v13, these things except the label are found elsewhere.
 */
export default class TokenRulerArtichron extends foundry.canvas.placeables.tokens.TokenRuler {}
