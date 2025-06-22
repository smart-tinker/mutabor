import React from 'react';
import styles from './TaskDetailModal.module.css';

export interface EditableFieldProps {
  label?: string;
  value: string | undefined | null | string[];
  editableValue: string;
  isEditing: boolean;
  isUpdating: boolean;
  error: string | null;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  inputType?: 'text' | 'textarea' | 'date';
  inputPlaceholder?: string;
  viewModeClassName?: string;
  editModeClassName?: string;
  labelClassName?: string;
  valueDisplayFormatter?: (val: string | undefined | null | string[]) => React.ReactNode;
  children?: React.ReactNode; // For custom content in view mode (e.g., tags map), takes precedence over value/valueDisplayFormatter

  // Class for the span that directly wraps the displayed value text/formatted value in view mode
  valueTextClassName?: string;
  // Class for the container of (value + edit button) in view mode
  valueAreaClassName?: string;
  editButtonClassName?: string;
  inputSpecificClassName?: string;
  controlsClassName?: string; // For the div wrapping save/cancel buttons
}

const EditableField: React.FC<EditableFieldProps> = ({
  label,
  value,
  editableValue,
  isEditing,
  isUpdating,
  error,
  onEdit,
  onCancel,
  onSave,
  onChange,
  inputType = 'text',
  inputPlaceholder,
  viewModeClassName = '',    // Applied to the root div in view mode
  editModeClassName = '',    // Applied to the root div in edit mode
  labelClassName = '',       // Applied to the label (strong tag)
  valueDisplayFormatter,
  children,
  valueTextClassName = '',   // Applied to the span wrapping the value text
  valueAreaClassName = '',   // Applied to the div wrapping (value text + edit button)
  editButtonClassName = '',  // Applied to the edit button
  inputSpecificClassName = '', // Applied to the input/textarea element
  controlsClassName = '',    // Applied to the div wrapping save/cancel buttons
}) => {

  const renderValueInViewMode = () => {
    if (children) {
      return children; // Children take precedence for custom view rendering
    }
    const displayedValue = valueDisplayFormatter ? valueDisplayFormatter(value) : (Array.isArray(value) ? value.join(', ') : (value || 'Not set'));
    return <span className={`${valueTextClassName} ${styles.editableFieldValueText}`}>{displayedValue}</span>;
  };

  if (!isEditing) {
    return (
      <div className={`${viewModeClassName}`}>
        {label && <strong className={`${labelClassName} ${styles.editableFieldLabel}`}>{label}</strong>}
        <div className={`${valueAreaClassName || styles.defaultValueArea}`}>
          {renderValueInViewMode()}
          <button
            onClick={onEdit}
            className={`${styles.button} ${styles.buttonLink} ${styles.editIcon} ${editButtonClassName}`}
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  // Edit Mode
  return (
    <div className={`${editModeClassName}`}>
      {/* Label can be optionally displayed in edit mode too, if structure requires it, handled by parent if needed */}
      {label && <strong className={`${labelClassName} ${styles.editableFieldLabel}`}>{label}</strong>}
      {inputType === 'textarea' ? (
        <textarea
          value={editableValue}
          onChange={onChange}
          placeholder={inputPlaceholder}
          className={`${inputSpecificClassName || styles.formTextareaFull}`}
          disabled={isUpdating}
        />
      ) : (
        <input
          type={inputType}
          value={editableValue}
          onChange={onChange}
          placeholder={inputPlaceholder}
          className={`${inputSpecificClassName || (inputType === 'date' ? styles.formInput : styles.formInputFull)}`}
          disabled={isUpdating}
        />
      )}
      <div className={`${controlsClassName || styles.inlineEditSectionControls}`}>
        <button
          onClick={onSave}
          className={`${styles.button} ${styles.buttonSmall} ${styles.buttonPrimary}`}
          disabled={isUpdating}
        >
          {isUpdating ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className={`${styles.button} ${styles.buttonSmall} ${styles.buttonSecondary}`}
          disabled={isUpdating}
        >
          Cancel
        </button>
      </div>
      {error && <p className={styles.errorTextSmall}>{error}</p>}
    </div>
  );
};

export default EditableField;
```
