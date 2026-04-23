import React, { useState } from "react";
import Map from "./components/Map/Map";
import Laboratory from "./components/Lab/Laboratory";

function App() {
  const [scene, setScene] = useState("map"); // "map" | "lab"

  return scene === "map"
    ? <Map onEnterLab={() => setScene("lab")} />
    : <Laboratory onBack={() => setScene("map")} />;
}

export default App;