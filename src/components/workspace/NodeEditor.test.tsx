// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { NodeEditor } from "./NodeEditor";
import { makeNode } from "@/test/helpers";
import * as nodeActions from "@/lib/actions/nodes";

vi.mock("@/lib/actions/nodes", () => ({
  renameNode: vi.fn(async () => {}),
  updateNodeContent: vi.fn(async () => {}),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("NodeEditor autosave", () => {
  it("flushes pending edits on unmount before the debounce fires (regression)", async () => {
    vi.useFakeTimers();
    const node = makeNode({ type: "node", content: "hello" });
    const { container, unmount } = render(
      <NodeEditor node={node} nodes={[]} workspaceId="ws-1" />
    );

    const textarea = container.querySelector("textarea")!;
    fireEvent.change(textarea, { target: { value: "hello world" } });

    // Unmount before the 800 ms debounce fires — should still flush.
    await act(async () => {
      unmount();
    });

    expect(nodeActions.updateNodeContent).toHaveBeenCalledWith(
      node.id,
      "hello world"
    );

    vi.useRealTimers();
  });

  it("debounce still works: save fires after 900 ms", async () => {
    vi.useFakeTimers();
    const node = makeNode({ type: "node", content: "hello" });
    const { container } = render(
      <NodeEditor node={node} nodes={[]} workspaceId="ws-1" />
    );

    const textarea = container.querySelector("textarea")!;
    fireEvent.change(textarea, { target: { value: "debounced" } });

    expect(nodeActions.updateNodeContent).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(900);
    });

    expect(nodeActions.updateNodeContent).toHaveBeenCalledWith(
      node.id,
      "debounced"
    );

    vi.useRealTimers();
  });

  it("clean unmount saves nothing", async () => {
    const node = makeNode({ type: "node", content: "hello" });
    const { unmount } = render(
      <NodeEditor node={node} nodes={[]} workspaceId="ws-1" />
    );

    await act(async () => {
      unmount();
    });

    expect(nodeActions.updateNodeContent).not.toHaveBeenCalled();
    expect(nodeActions.renameNode).not.toHaveBeenCalled();
  });

  it("no double save: debounce fires then unmount does not re-save", async () => {
    vi.useFakeTimers();
    const node = makeNode({ type: "node", content: "hello" });
    const { container, unmount } = render(
      <NodeEditor node={node} nodes={[]} workspaceId="ws-1" />
    );

    const textarea = container.querySelector("textarea")!;
    fireEvent.change(textarea, { target: { value: "once only" } });

    // Let the debounce fire.
    await act(async () => {
      vi.advanceTimersByTime(900);
    });

    expect(nodeActions.updateNodeContent).toHaveBeenCalledTimes(1);

    // Unmount — pending.current was cleared by persist, so no second save.
    await act(async () => {
      unmount();
    });

    expect(nodeActions.updateNodeContent).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
