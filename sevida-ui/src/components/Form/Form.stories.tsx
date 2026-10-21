import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Card } from '../Card/Card';
import { FormSection, FormField } from './FormSection';
import { TextField, DateField, SelectField, AutocompleteField, CheckboxField, SwitchField, RadioGroupField } from './fields';

const meta: Meta = { title: 'Components/Form', tags: ['!autodocs'] };
export default meta;

const languages = ['English', 'Spanish', 'Hindi', 'Arabic', 'Mandarin', 'French', 'Portuguese', 'Tagalog'].map((l) => ({ value: l.toLowerCase(), label: l }));

export const FullForm: StoryObj = {
  name: 'Form (responsive grid)',
  render: () => {
    const [name, setName] = useState('');
    const [notes, setNotes] = useState('');
    const [program, setProgram] = useState('');
    const [lang, setLang] = useState<string | null>(null);
    const [others, setOthers] = useState<string[]>(['english']);
    const [consent, setConsent] = useState(true);
    const [sms, setSms] = useState(false);
    const [contact, setContact] = useState('phone');
    return (
      <Card title="New member">
        <FormSection title="Basics" columns={3}>
          <TextField label="Full name" required value={name} onChange={(e) => setName(e.target.value)} error={name === ''} helperText={name === '' ? 'Required' : ' '} />
          <DateField label="Date of birth" />
          <SelectField label="Program" value={program} onChange={setProgram} options={[{ value: 'chronic', label: 'Chronic Care' }, { value: 'maternal', label: 'Maternal Health' }, { value: 'bh', label: 'Behavioral Health', disabled: true }]} />
          <AutocompleteField label="Primary language" options={languages} value={lang} onChange={setLang} placeholder="Type to search" />
          <AutocompleteField multiple label="Other languages" options={languages} value={others} onChange={setOthers} />
          <TextField label="Phone" type="tel" />
          <FormField span="full">
            <TextField label="Notes" multiline minRows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} />
          </FormField>
        </FormSection>
        <FormSection title="Preferences" description="How we should reach this member." columns={2}>
          <RadioGroupField label="Preferred contact" row value={contact} onChange={setContact} options={[{ value: 'phone', label: 'Phone' }, { value: 'sms', label: 'Text' }, { value: 'email', label: 'Email' }]} />
          <div>
            <SwitchField label="Allow text messages" checked={sms} onChange={setSms} helperText="Standard message rates apply." />
            <CheckboxField label="Consent recorded" checked={consent} onChange={setConsent} />
          </div>
        </FormSection>
      </Card>
    );
  },
};
