function App() {
  return (
    <>
      <form action="http://localhost:8001/upload" method="post">
        <input
          name="localName"
          type="text"
          placeholder="Please Enter here your prompt"
        />
        <button type="submit">Submit</button>
      </form>
    </>
  );
}
export default App;
