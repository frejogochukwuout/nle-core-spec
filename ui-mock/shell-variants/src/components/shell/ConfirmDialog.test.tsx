/* ConfirmDialog — spec 18 §6.4 destructive-action confirmation: focus-trapped
   alertdialog, WAI-aligned initial focus (danger → cancel-first, non-danger →
   confirm-first), Esc / ⌘. cancel, two-stop Tab trap, backdrop pointer-down
   cancel (dialog content excluded), danger styling, and the useConfirm()
   provider contract. */

import { describe, expect, it, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ConfirmProvider, useConfirm } from './ConfirmDialog';
import { renderShell, renderPlain } from '../../test/helpers';

afterEach(() => { vi.restoreAllMocks(); });

/** the consumer contract: confirm(opts) from any leaf under the provider */
function Harness({ onConfirm, danger = true }: { onConfirm: () => void; danger?: boolean }) {
  const confirm = useConfirm();
  return (
    <button
      onClick={() => confirm({
        title: 'Delete scene?',
        body: 'This removes 3 clips.',
        confirmLabel: 'Delete',
        danger,
        onConfirm,
      })}
    >
      open
    </button>
  );
}

function mountDialog(onConfirm: () => void, danger = true) {
  const utils = renderShell(<Harness onConfirm={onConfirm} danger={danger} />);
  fireEvent.click(screen.getByRole('button', { name: 'open' }));
  return utils;
}

describe('ConfirmDialog (spec 18 §6.4)', () => {
  it('renders a modal alertdialog with title/body and the danger confirm button', () => {
    mountDialog(() => {});
    expect(screen.getByTestId('shell-confirm')).toHaveAttribute('role', 'alertdialog');
    expect(screen.getByTestId('shell-confirm')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Delete scene?')).toBeInTheDocument();
    expect(screen.getByText('This removes 3 clips.')).toBeInTheDocument();
    expect(screen.getByTestId('shell-confirm-confirm')).toHaveTextContent('Delete');
    expect(screen.getByTestId('shell-confirm-confirm')).toHaveClass('danger');
    expect(screen.getByTestId('shell-confirm-cancel')).toHaveTextContent('Cancel');
  });

  it('initial focus follows the danger flag: danger → CANCEL (safe) button, non-danger → confirm', () => {
    // R13 fix (WAI dialog guidance): destructive confirms start on the safe
    // stop — Delete must be a deliberate keypress, undo is the safety net
    mountDialog(() => {}, true);
    expect(screen.getByTestId('shell-confirm-cancel')).toHaveFocus();
    cleanup();
    mountDialog(() => {}, false);
    expect(screen.getByTestId('shell-confirm-confirm')).toHaveFocus();
  });

  it('confirm fires onConfirm exactly once and unmounts the dialog', () => {
    const onConfirm = vi.fn();
    mountDialog(onConfirm);
    fireEvent.click(screen.getByTestId('shell-confirm-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('cancel button, Esc and ⌘. all cancel without firing onConfirm', () => {
    const onConfirm = vi.fn();
    let utils = mountDialog(onConfirm);
    fireEvent.click(screen.getByTestId('shell-confirm-cancel'));
    expect(onConfirm).not.toHaveBeenCalled();
    utils.unmount();

    utils = mountDialog(onConfirm);
    fireEvent.keyDown(screen.getByTestId('shell-confirm'), { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    utils.unmount();

    utils = mountDialog(onConfirm);
    fireEvent.keyDown(screen.getByTestId('shell-confirm'), { key: '.', metaKey: true }); // §6.4 ⌘.
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    utils.unmount();
  });

  it('Tab cycles the two-stop focus trap; Shift+Tab walks back', () => {
    mountDialog(() => {}, false); // non-danger: confirm-first, as the trap walk assumes
    const confirm = screen.getByTestId('shell-confirm-confirm');
    const cancel = screen.getByTestId('shell-confirm-cancel');
    expect(confirm).toHaveFocus();
    fireEvent.keyDown(screen.getByTestId('shell-confirm'), { key: 'Tab' });
    expect(cancel).toHaveFocus();
    fireEvent.keyDown(screen.getByTestId('shell-confirm'), { key: 'Tab' });
    expect(confirm).toHaveFocus(); // wraps inside the trap
    fireEvent.keyDown(screen.getByTestId('shell-confirm'), { key: 'Tab', shiftKey: true });
    expect(cancel).toHaveFocus();
  });

  it('pointer-down on the backdrop cancels; on the dialog itself it does not', () => {
    mountDialog(() => {});
    const dialog = screen.getByTestId('shell-confirm');
    fireEvent.pointerDown(dialog); // bubbles to backdrop but target ≠ backdrop
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    fireEvent.pointerDown(dialog.parentElement!); // the backdrop itself
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('useConfirm() outside a provider throws its contract error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}); // silence the render error log
    function Bare() { useConfirm(); return null; }
    expect(() => renderPlain(<Bare />)).toThrow(/ConfirmProvider/);
  });

  /* ---- R24-W5b (DESIGN-R24 §2 F1-P3): focus returns to the INVOKER on
     close — every route (WAI dialog guidance; the old dialog never
     restored, focus fell to <body> after the unmount). ---- */
  it('R24-W5b: the CANCEL route restores focus to the invoker', () => {
    renderShell(<Harness onConfirm={() => {}} />);
    const opener = screen.getByRole('button', { name: 'open' });
    opener.focus(); // the invoker holds focus when confirm() fires
    fireEvent.click(opener);
    // the trap took focus (danger → cancel-first)…
    expect(screen.getByTestId('shell-confirm-cancel')).toHaveFocus();
    fireEvent.click(screen.getByTestId('shell-confirm-cancel'));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus(); // …and the close gave it back — the F1 finding, dead
  });

  it('R24-W5b: the CONFIRM route restores focus to the invoker too (after onConfirm runs)', () => {
    const onConfirm = vi.fn();
    renderShell(<Harness onConfirm={onConfirm} />);
    const opener = screen.getByRole('button', { name: 'open' });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(screen.getByTestId('shell-confirm-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('R24-W5b: the Esc route restores focus as well (the restore rides the shared close funnel)', () => {
    renderShell(<Harness onConfirm={() => {}} />);
    const opener = screen.getByRole('button', { name: 'open' });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.keyDown(screen.getByTestId('shell-confirm'), { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
