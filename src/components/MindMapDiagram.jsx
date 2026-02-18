import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';

let mermaidInit = false;
function initMermaid() {
  if (mermaidInit) return;
  mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
  mermaidInit = true;
}

function sanitizeLabel(label) {
  if (label == null) return '';
  const s = String(label).replace(/\s+/g, ' ').trim().slice(0, 80);
  if (/[[\]():]/.test(s) || s.includes('"')) return `"${s.replace(/"/g, '\\"')}"`;
  return s;
}

function treeToMermaidLines(node, indent = 4) {
  if (!node || !node.label) return [];
  const line = ' '.repeat(indent) + sanitizeLabel(node.label);
  const lines = [line];
  const children = Array.isArray(node.children) ? node.children : [];
  children.forEach((child) => {
    lines.push(...treeToMermaidLines(child, indent + 4));
  });
  return lines;
}

function buildMermaidCode(data) {
  const lines = treeToMermaidLines(data);
  if (lines.length === 0) return 'mindmap\n    empty';
  return 'mindmap\n' + lines.join('\n');
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;
const INITIAL_SCALE = 0.85;

export default function MindMapDiagram({ data, className = '' }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(INITIAL_SCALE);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!data || !data.label) {
      setSvg('');
      setError('No data');
      return;
    }
    setError(null);
    initMermaid();
    const code = buildMermaidCode(data);
    const id = `mindmap-${Math.random().toString(36).slice(2, 11)}-${Date.now()}`;
    mermaid
      .render(id, code)
      .then(({ svg: result }) => {
        setSvg(result);
      })
      .catch((err) => {
        setError(err?.message || 'Diagram failed');
        setSvg('');
      });
  }, [data]);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta)));
  }, []);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
  }, [translate]);

  const onMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      setTranslate({
        x: dragStart.current.tx + e.clientX - dragStart.current.x,
        y: dragStart.current.ty + e.clientY - dragStart.current.y,
      });
    },
    [isDragging]
  );

  const onMouseUp = useCallback(() => setIsDragging(false), []);
  const onMouseLeave = useCallback(() => setIsDragging(false), []);

  const onDoubleClick = useCallback(() => {
    setScale(INITIAL_SCALE);
    setTranslate({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const w = wrapRef.current;
    if (!w) return;
    const prevent = (e) => e.preventDefault();
    w.addEventListener('wheel', prevent, { passive: false });
    return () => w.removeEventListener('wheel', prevent);
  }, [svg]);

  if (error) {
    return (
      <div className={`rounded-xl border border-dashed p-6 text-center text-muted-foreground ${className}`}>
        {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className={`flex items-center justify-center rounded-xl border border-dashed p-8 ${className}`}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={`min-h-[420px] w-full ${className}`}>
      <p className="text-center text-xs text-muted-foreground" dir="auto">
        اسحب للنقل • عجلة الماوس للتكبير/التصغير • دبل كليك لإعادة التعيين · Drag to pan · Scroll to zoom · Double-click to reset
      </p>
      <div
        ref={wrapRef}
        className="overflow-hidden rounded-xl border border-border bg-card min-h-[380px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
        style={{ touchAction: 'none' }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onDoubleClick={onDoubleClick}
      >
        <div
          className="origin-center p-6 inline-flex items-center justify-center"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          }}
        >
          <div
            className="rounded-lg bg-card"
            dangerouslySetInnerHTML={{ __html: svg }}
            style={{ minWidth: 'min(100%, 560px)' }}
          />
        </div>
      </div>
    </div>
  );
}
