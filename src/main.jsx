import React from "react";
import ReactDOM from "react-dom/client";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import App from "./App";
import "./styles.css";

function Root() {
  const [user, setUser] = React.useState(undefined);

  React.useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  if (user === undefined) {
    return <div className="loading">Đang mở quỹ chi tiêu cho bé… 💕</div>;
  }

  return <App user={user} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><Root /></React.StrictMode>
);
