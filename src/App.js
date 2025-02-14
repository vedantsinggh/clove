import { useState } from "react";
import "./App.css";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [walkieOpen, setWalkieOpen] = useState(false);

  const sendMessage = () => {
    if (input.trim()) {
      setMessages([...messages, { text: input, sender: "You" }]);
      setInput("");
    }
  };

  return (
    <div className="app-container">
      <h1>Echo Walkie-Talkie</h1>
      <div className="chat-container">
        <div className="chat-window">
          {messages.map((msg, index) => (
            <div key={index} className="message">
              <strong>{msg.sender}:</strong> {msg.text}
            </div>
          ))}
        </div>
        <div className="input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
      <button className="walkie-toggle" onClick={() => setWalkieOpen(!walkieOpen)}>
        {walkieOpen ? "Close Walkie-Talkie" : "Open Walkie-Talkie"}
      </button>
      {walkieOpen && <div className="walkie-window">Walkie-Talkie Mode</div>}
    </div>
  );
}
