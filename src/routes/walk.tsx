import { createFileRoute } from "@tanstack/react-router";
import { KlayApp } from "@/klay/app";

export const Route = createFileRoute("/walk")({ component: KlayApp });
