import { Deal, Seat } from "./deck";
import { Bid } from "./auction";

export type GameState = {
  deal: Deal;
  auction: Bid[];
  turn: Seat;
};