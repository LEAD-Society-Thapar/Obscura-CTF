import { useParams } from "react-router-dom";
import Placeholder from "../components/ui/Placeholder.jsx";
export default function ReelCard() {
  const { cpNumber } = useParams();
  return <Placeholder title={`Reel Card - CP${cpNumber}`}>Story beat, relic, clue to the next gate.</Placeholder>;
}
