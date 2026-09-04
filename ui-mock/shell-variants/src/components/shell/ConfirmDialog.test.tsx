/* ConfirmDialog — spec 18 §6.4 destructive-action confirmation: focus-trapped
   alertdialog, confirm-button-first focus, Esc / ⌘. cancel, two-stop Tab
   trap, backdrop pointer-down cancel (dialog content excluded), danger
   styling, and the useConfirm() provider contract. */

import { describe, expect, it, afterEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConfirmProvider, useConfirm } from './ConfirmDialog';
import { renderShell, renderPlain } from '../../test/helpers';

afterEach(() => { vi.restoreAllMocks(); });

/** the consumer contract: confirm(opts) from any leaf under the provider */
function Harness({ onConfirm }: { onConfirm: () => void }) {
  const confirm = useConfirm();
  return (
    <button
      onClick={() => confirm({
        title: 'Delete scene?',
        body: 'This removes 3 clips.',
        confirmLabel: 'Delete',
        danger: true,
        onConfirm,
      })}
    >
      open
    </button>
  );
}

function mountDialog(onConfirm: () => void) {
  const utils = renderShell(<Harness onConfirm={onConfirm} />);
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

  it('focus lands on the confirm button when the dialog opens', () => {
    mountDialog(() => {});
    // destructive default = confirm is the safe-to-review stop first
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
    mountDialog(() => {});
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
});
