import { Box } from '@mui/material';

export interface VisuallyHiddenTableProps {
  caption: string;
  columns: string[];
  rows: string[][];
}

/** The numbers behind a chart as a real table that only screen readers see. Every chart in this folder includes one. */
export function VisuallyHiddenTable({ caption, columns, rows }: VisuallyHiddenTableProps) {
  return (
    <Box component="table" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0, p: 0, m: -1 }}>
      <caption>{caption}</caption>
      <thead>
        <tr>{columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>{r.map((c, j) => (j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>))}</tr>
        ))}
      </tbody>
    </Box>
  );
}
