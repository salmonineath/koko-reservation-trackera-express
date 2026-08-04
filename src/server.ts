import express, { Request, Response } from "express";

const app = express();
const PORT = 3000;

// Allow Express to read JSON request bodies
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Express TypeScript server is running"
  });
});

app.get("/api/hello", (req: Request, res: Response) => {
  res.json({
    message: "Hello from the API"
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
