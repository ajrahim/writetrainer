import type { GrePrompt } from "@/types/review";

export const grePrompts: GrePrompt[] = [
  {
    id: "issue-civic-education",
    type: "Issue",
    title: "Civic Education and Public Life",
    question:
      "To understand the most important characteristics of a society, one must study its major cities. Write a response in which you discuss the extent to which you agree or disagree with the statement and explain your reasoning.",
  },
  {
    id: "argument-transit-plan",
    type: "Argument",
    title: "City Transit Plan",
    question:
      "A city council argues that adding express bus routes will reduce traffic congestion because nearby cities reported shorter commutes after adopting similar routes. Write a response in which you examine the stated and unstated assumptions of the argument.",
  },
];

export const defaultPrompt = grePrompts[0];
