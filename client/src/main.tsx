import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");

if (root) {
  document.title = "Vedo - Bookkeeping Application";
  
  // Create meta description
  let metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription) {
    metaDescription = document.createElement('meta');
    metaDescription.setAttribute('name', 'description');
    document.head.appendChild(metaDescription);
  }
  metaDescription.setAttribute('content', 'Professional bookkeeping application with invoicing, expense tracking, and double-entry accounting features');
  
  createRoot(root).render(<App />);
}
