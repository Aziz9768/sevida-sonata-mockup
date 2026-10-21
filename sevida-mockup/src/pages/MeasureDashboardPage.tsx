import { Navigate, useParams } from "react-router-dom";

/** Old address of a measure dashboard. There is one dashboard page now: the measure is picked with the tiles at the top. */
export function MeasureDashboardPage() {
  const { code } = useParams();
  return <Navigate to={`/dashboard?m=${code ?? ""}`} replace />;
}

export default MeasureDashboardPage;
