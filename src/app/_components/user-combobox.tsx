'use client';

import * as React from 'react';
import { Popover } from 'radix-ui';
import { Command } from 'cmdk';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/app/_lib/utils';

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export function UserCombobox({
  users,
  value,
  onChange,
  onBlur,
  ref,
}: {
  users: { id: string; name: string | null }[];
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  ref?: React.Ref<HTMLButtonElement>;
}) {
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const contentId = React.useId();
  const selected = users.find((user) => user.id === value);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          id="userId"
          ref={ref}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? contentId : undefined}
          className="mt-2 w-full justify-between font-normal"
          onBlur={onBlur}
        >
          <span
            className={cn('truncate', !selected && 'text-muted-foreground')}
          >
            {selected
              ? selected.name || 'Usuário sem nome'
              : 'Selecione um usuário (opcional)'}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          id={contentId}
          align="start"
          sideOffset={4}
          className="bg-popover text-popover-foreground z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-md border shadow-md"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <Command
            label="Selecionar usuário"
            loop
            filter={(_value, search, keywords) => {
              const name = normalize(keywords?.[0] || '');
              return normalize(search)
                .trim()
                .split(/\s+/)
                .every((term) => name.includes(term))
                ? 1
                : 0;
            }}
          >
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="text-muted-foreground size-4 shrink-0" />
              <Command.Input
                ref={inputRef}
                placeholder="Pesquisar pelo nome..."
                aria-label="Pesquisar usuário pelo nome"
                className="placeholder:text-muted-foreground h-11 w-full bg-transparent text-sm outline-none"
              />
            </div>
            <Command.List className="max-h-[min(240px,var(--radix-popover-content-available-height))] overflow-y-auto p-1">
              <Command.Empty className="text-muted-foreground py-6 text-center text-sm">
                Nenhum usuário encontrado.
              </Command.Empty>
              {users.map((user) => (
                <Command.Item
                  key={user.id}
                  value={user.id}
                  keywords={[user.name || 'Usuário sem nome']}
                  onSelect={() => {
                    onChange(user.id);
                    setOpen(false);
                  }}
                  className="data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none"
                >
                  <Check
                    className={cn(
                      'size-4 shrink-0',
                      value === user.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="truncate">
                    {user.name || 'Usuário sem nome'}
                  </span>
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
