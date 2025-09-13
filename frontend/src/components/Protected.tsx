import { Navigate } from "react-router-dom";
export default function Protected({ allow, role, children }:{
  allow: "admin" | "applicant"; role?: string | null; children: JSX.Element;
}) {
  if (role !== allow) return <Navigate to="/auth" replace/>;
  return children;
}
