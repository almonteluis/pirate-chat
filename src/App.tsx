import "./App.css";

function App() {
  return (
    <main>
      <h1>Pirate Chat Bot</h1>
      <p className="message ai">message</p>
      <p className="message user">message 2</p>
      <p className="message ai">message 3</p>
      <form className="input-form">
        <input type="text" placeholder="message" />
        <input type="submit" value="Send" />
      </form>
    </main>
  );
}

export default App;
