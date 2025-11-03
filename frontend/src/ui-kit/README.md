# UI Kit - Unified Design System

## Overview

The UI Kit is a centralized design system for the Medical CRM application. It provides a single source of truth for all UI components, design tokens, and styling patterns.

## Structure

```
ui-kit/
├── components/     # React components
│   ├── button.jsx
│   ├── card.jsx
│   ├── badge.jsx
│   ├── input.jsx
│   ├── label.jsx
│   ├── dialog.jsx
│   ├── avatar.jsx
│   ├── table.jsx
│   ├── skeleton.jsx
│   └── separator.jsx
├── tokens.js      # Design tokens (colors, spacing, typography)
├── index.js       # Main export file
└── README.md      # This file
```

## Design Tokens

The design system uses centralized tokens defined in `tokens.js`:

- **Colors:** Medical blue-green palette (preserved from existing design)
- **Spacing:** Consistent spacing scale
- **Typography:** Arabic font support (Cairo, Tajawal)
- **Shadows:** Premium shadow system
- **Animations:** Standardized animation durations and easings
- **Breakpoints:** Responsive breakpoints

## Components

### Button

Unified button component with multiple variants and sizes.

```jsx
import { Button } from '../ui-kit'

// Variants
<Button variant="default">افتراضي</Button>
<Button variant="primary">أساسي</Button>
<Button variant="secondary">ثانوي</Button>
<Button variant="outline">محدد</Button>
<Button variant="ghost">شبح</Button>
<Button variant="danger">خطر</Button>

// Sizes
<Button size="sm">صغير</Button>
<Button size="md">متوسط</Button>
<Button size="lg">كبير</Button>

// States
<Button loading>جاري التحميل...</Button>
<Button disabled>معطل</Button>
```

### Card

Card component with header, content, and footer sections.

```jsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui-kit'

<Card variant="default">
  <CardHeader>
    <CardTitle>العنوان</CardTitle>
    <CardDescription>الوصف</CardDescription>
  </CardHeader>
  <CardContent>
    المحتوى
  </CardContent>
  <CardFooter>
    <Button>إجراء</Button>
  </CardFooter>
</Card>
```

### Badge

Status badges with multiple variants.

```jsx
import { Badge } from '../ui-kit'

<Badge variant="default">افتراضي</Badge>
<Badge variant="success">نجاح</Badge>
<Badge variant="destructive">تدميري</Badge>
<Badge variant="outline">محدد</Badge>
```

### Input & Label

Form input components with RTL support.

```jsx
import { Input, Label } from '../ui-kit'

<Label htmlFor="email">البريد الإلكتروني</Label>
<Input id="email" type="email" placeholder="أدخل البريد..." />
```

### Dialog

Modal/dialog component based on Radix UI.

```jsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui-kit'

<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>فتح</Button>
  </DialogTrigger>
  <DialogContent size="md">
    <DialogHeader>
      <DialogTitle>العنوان</DialogTitle>
      <DialogDescription>الوصف</DialogDescription>
    </DialogHeader>
    <div>المحتوى</div>
    <DialogFooter>
      <Button variant="outline">إلغاء</Button>
      <Button>تأكيد</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Table

Data table component with RTL support.

```jsx
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui-kit'

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>الاسم</TableHead>
      <TableHead>الدور</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>أحمد</TableCell>
      <TableCell>طبيب</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## Design Principles

1. **Consistency:** All components follow the same design patterns
2. **Accessibility:** RTL support, keyboard navigation, ARIA labels
3. **Medical Theme:** Blue-green color palette preserved
4. **Responsive:** Mobile-first approach
5. **Backward Compatible:** Existing components remain functional

## Migration Guide

The UI Kit provides a unified design system. Existing components (`components/common/` and `components/ui/`) continue to work, but new development should use the UI Kit.

### Importing Components

```jsx
// Old way (still works)
import Button from '../components/common/Button'
import { Card } from '../components/common/Card'

// New way (recommended)
import { Button, Card } from '../ui-kit'
```

### Showcase Page

A comprehensive showcase page is available at `pages/DesignSystemShowcase.jsx` demonstrating all components. Add it to the router to view:

```jsx
// In App.jsx (for development/testing)
<Route path="/design-system" element={<DesignSystemShowcase />} />
```

## Backward Compatibility

The design system maintains backward compatibility with existing components:
- Existing imports continue to work
- No breaking changes to existing component APIs
- Gradual migration path available

## Color Palette

The design system preserves the existing medical color palette:

- **Medical Blue:** `#0EA5E9` (Primary)
- **Medical Green:** `#10B981` (Secondary)
- **Error:** `#ef4444`
- **Warning:** `#f59e0b`
- **Success:** `#10B981`

All colors are defined in `tokens.js` and can be accessed via the Tailwind config.

## RTL Support

All components are RTL-aware and support Arabic text:
- Text alignment: right
- Icons and arrows: mirrored where appropriate
- Layout flow: right-to-left

## Contributing

When adding new components to the UI Kit:

1. Follow existing patterns
2. Add RTL support
3. Include variants for medical theme
4. Document in this README
5. Add examples to the showcase page

## Future Enhancements

- [ ] Add more form components (Select, Checkbox, Radio)
- [ ] Add date picker component
- [ ] Add dropdown menu component
- [ ] Add tooltip component
- [ ] Add loading states component
- [ ] Add notification/toast component
- [ ] Storybook integration

