import React, { useState, useEffect } from 'react';

interface Block {
  id: string;
  text: string;
}

interface DraggableBlocksProps {
  initialBlocks?: string[];
  onChange?: (blocks: string[]) => void;
  readOnly?: boolean;
  placeholder?: string;
  label?: string;
}

export default function DraggableBlocks({
  initialBlocks = [],
  onChange,
  readOnly = false,
  placeholder = "Escribe un punto...",
  label = "Bloques de contenido"
}: DraggableBlocksProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [newText, setNewText] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Initialize blocks
  useEffect(() => {
    if (initialBlocks.length > 0) {
      setBlocks(initialBlocks.map((text, idx) => ({ id: `${idx}-${Date.now()}`, text })));
    } else if (!readOnly && blocks.length === 0) {
      setBlocks([{ id: `default-1`, text: '' }]);
    }
  }, [initialBlocks]);

  // Propagate changes
  const notifyChange = (updatedBlocks: Block[]) => {
    if (onChange) {
      onChange(updatedBlocks.map(b => b.text).filter(t => t.trim() !== ''));
    }
  };

  const handleAddBlock = () => {
    if (!newText.trim()) return;
    const updated = [...blocks, { id: `${Date.now()}`, text: newText }];
    setBlocks(updated);
    setNewText('');
    notifyChange(updated);
  };

  const handleUpdateBlock = (index: number, value: string) => {
    const updated = [...blocks];
    updated[index].text = value;
    setBlocks(updated);
    notifyChange(updated);
  };

  const handleRemoveBlock = (index: number) => {
    const updated = blocks.filter((_, idx) => idx !== index);
    setBlocks(updated);
    notifyChange(updated);
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (readOnly) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Required for Firefox
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (readOnly || draggedIndex === null || draggedIndex === index) return;
    e.preventDefault();
    
    const updated = [...blocks];
    const draggedItem = updated[draggedIndex];
    
    // Reorder array
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    setBlocks(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    notifyChange(blocks);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <span className="overline">{label}</span>
      </div>

      <div className="flex flex-col gap-2">
        {blocks.map((block, idx) => (
          <div
            key={block.id}
            draggable={!readOnly}
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg ${
              draggedIndex === idx ? 'opacity-50 border-blue-500 scale-[0.99]' : ''
            } ${!readOnly ? 'cursor-grab active:cursor-grabbing' : ''}`}
            style={{ touchAction: 'none' }}
          >
            {/* Drag Handle Indicator */}
            {!readOnly && (
              <span className="text-gray-400 select-none cursor-grab active:cursor-grabbing flex-shrink-0" title="Arrastrar para reordenar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="9" cy="5" r="1" />
                  <circle cx="9" cy="12" r="1" />
                  <circle cx="9" cy="19" r="1" />
                  <circle cx="15" cy="5" r="1" />
                  <circle cx="15" cy="12" r="1" />
                  <circle cx="15" cy="19" r="1" />
                </svg>
              </span>
            )}

            {/* Block Number */}
            <span className="font-mono text-xs text-gray-500 flex-shrink-0 w-6">
              {String(idx + 1).padStart(2, '0')}
            </span>

            {/* Content Input or Static Text */}
            {readOnly ? (
              <p className="text-sm text-gray-800 flex-1 py-1">{block.text || <em className="text-gray-400">Bloque vacío</em>}</p>
            ) : (
              <input
                type="text"
                value={block.text}
                onChange={(e) => handleUpdateBlock(idx, e.target.value)}
                placeholder={placeholder}
                className="text-sm text-gray-800 flex-1 border-none focus:outline-none focus:ring-0 bg-transparent py-1"
              />
            )}

            {/* Delete button */}
            {!readOnly && blocks.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveBlock(idx)}
                className="text-gray-400 hover:text-red-700 p-1 rounded transition-colors flex-shrink-0"
                title="Eliminar bloque"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Input to Add New Block */}
      {!readOnly && (
        <div className="flex gap-2 items-center mt-1">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddBlock())}
            placeholder="Agregar un nuevo punto..."
            className="flex-1 height-[44px] px-3 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={handleAddBlock}
            className="btn btn--primary flex-shrink-0"
            style={{ height: '44px' }}
          >
            Añadir
          </button>
        </div>
      )}
    </div>
  );
}
