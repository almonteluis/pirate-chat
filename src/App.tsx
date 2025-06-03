import { useState } from "react";
import "./App.css";

type Message = {
  text: string;
  sender: "user" | "ai";
};

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Sample message",
      sender: "ai",
    },
    {
      text: "Sample message",
      sender: "user",
    },
  ]);
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessages([...messages, { text: input, sender: "user" }]);
    setInput("");
  };

  return (
    <main>
      <h1>Pirate Chat Bot</h1>
      <section
        className="messages-container"
        role="log"
        aria-live="polite"
        aria-label="Chat conversation"
      >
        {messages.map((message, i) => (
          <div
            className={`message ${message.sender}`}
            key={i}
            role="article"
            aria-label={`${message.sender === "ai" ? "Bot" : "User"} message`}
            tabIndex={0}
          >
            <span className="sr-only">
              {message.sender === "ai" ? "Bot says: " : "You said: "}
            </span>
            {message.text}
          </div>
        ))}
      </section>
      <form className="input-form" onSubmit={handleSubmit}>
        <label htmlFor="message-input" className="sr-only">
          Type your message
        </label>
        <input
          id="message-input"
          type="text"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-describedby="send-button"
          required
        />
        <button id="send-button" type="submit" aria-label="Send message">
          Send
        </button>
      </form>
    </main>
  );
}

export default App;
