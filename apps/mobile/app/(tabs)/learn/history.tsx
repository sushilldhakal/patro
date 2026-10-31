import { Redirect } from "expo-router";

/** Web retired the standalone history page — `history` is now the chapter of `surya-siddhanta`. */
export default function LearnHistoryRedirect() {
  return <Redirect href="/learn/surya-siddhanta" />;
}
