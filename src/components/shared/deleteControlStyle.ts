import type { CSSProperties } from 'react';

/**
 * Shared inline style for the floating "delete area" control rendered on top of
 * the map in {@link CreateArea} and {@link UpdateArea}.
 *
 * @internal
 */
export const deleteControlStyle: CSSProperties = {
    top: 10,
    right: '52px',
    width: '40px',
    height: '40px',
    borderRadius: 2,
    display: 'flex',
    cursor: 'pointer',
    alignItems: 'center',
    position: 'absolute',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderLeft: '1px solid #f1f1f1'
};
