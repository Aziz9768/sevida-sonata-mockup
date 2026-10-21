import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Pagination } from './Pagination';

const meta: Meta = { title: 'Components/Pagination', parameters: { layout: 'padded' }, tags: ['!autodocs'] };
export default meta;

export const Default: StoryObj = {
  render: () => {
    const [page, setPage] = useState(4);
    const [size, setSize] = useState(10);
    return <Pagination page={page} pageSize={size} total={248} onPageChange={setPage} onPageSizeChange={(n) => { setSize(n); setPage(1); }} />;
  },
};

export const Short: StoryObj = {
  name: 'Few pages',
  render: () => <Pagination page={1} pageSize={10} total={24} onPageChange={() => undefined} />,
};
