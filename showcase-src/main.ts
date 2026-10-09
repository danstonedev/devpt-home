import { mount } from "svelte";
import "@vspx/design-tokens/index.css";
import "@simlab/app.css";
import "@simlab/lib/material-symbols.css";
import "@simlab/lib/conversation.css";
import "@simlab/lib/system.css";
import "@simlab/lib/ddx/styles/index.css";
import Showcase from "./Showcase.svelte";

mount(Showcase, { target: document.getElementById("app")! });
