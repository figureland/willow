import { type ReactNode, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/shell'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  DatePicker,
  IconList,
  IconMap,
  IconMenuCollapse,
  IconMenuFarm,
  IconMenuFinancial,
  IconMenuHome,
  IconMenuOpportunities,
  IconMenuSustainability,
  IconMenuUtilities,
  IconPalette,
  IconPlus,
  IconSearch,
  IconTrendDown,
  IconTrendUp,
  MultiSelect,
  Radio,
  RadioGroup,
  SegmentedControl,
  Select,
  type SelectGroup as SelectGroupType,
  type SelectOption,
  StatCard,
  Tab,
  TabBar,
  TabPanel,
  Tabs,
  TextInput,
} from '../components/ui'

const Section = ({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) => (
  <section className="flex flex-col gap-4">
    <header className="flex flex-col gap-1">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      {description ? (
        <p className="text-sm text-text-secondary">{description}</p>
      ) : null}
    </header>
    <Card>{children}</Card>
  </section>
)

const Swatch = ({
  name,
  className,
  hex,
}: {
  name: string
  className: string
  hex: string
}) => (
  <div className="flex flex-col gap-2">
    <div
      className={`h-14 rounded-md border border-border-tertiary ${className}`}
      aria-hidden="true"
    />
    <div className="flex flex-col">
      <span className="text-xs font-medium text-text-primary">{name}</span>
      <span className="font-mono text-xs text-text-secondary">{hex}</span>
    </div>
  </div>
)

const TokenGroup = ({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) => (
  <div className="flex flex-col gap-3">
    <span className="text-xs uppercase tracking-wider text-text-secondary">
      {label}
    </span>
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {children}
    </div>
  </div>
)

const TypeRow = ({
  label,
  className,
  sample,
}: {
  label: string
  className: string
  sample: string
}) => (
  <div className="flex flex-col gap-1 border-b border-border-tertiary pb-4 last:border-b-0 last:pb-0">
    <span className="text-xs uppercase tracking-wider text-text-secondary">
      {label}
    </span>
    <span className={className}>{sample}</span>
  </div>
)

const SegmentedControlDemo = () => {
  const [view, setView] = useState<'list' | 'map'>('list')
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        ariaLabel="View mode"
        value={view}
        onValueChange={setView}
        options={[
          { value: 'list', label: 'List', leadingIcon: <IconList /> },
          { value: 'map', label: 'Map', leadingIcon: <IconMap /> },
        ]}
      />
      <p className="text-sm text-text-secondary">Active: {view}</p>
    </div>
  )
}

const IconCell = ({ name, icon }: { name: string; icon: ReactNode }) => (
  <div className="flex flex-col items-center gap-2 rounded-md border border-border-tertiary p-3">
    <span className="text-icon-primary">{icon}</span>
    <span className="font-mono text-xs text-text-secondary">{name}</span>
  </div>
)

export const DesignSystemPage = () => {
  const navigate = useNavigate()
  return (
    <AppShell
      header={{
        title: 'Design system',
        onBack: () => navigate(-1),
      }}
    >
      <div className="flex flex-col gap-8">
        <p className="text-text-secondary max-w-2xl">
          Reference for the primitives that compose every prototype screen.
          Tokens here are the source of truth — anything that doesn't appear on
          this page shouldn't appear in production screens either.
        </p>

        <Section
          title="Colour"
          description="Two layers: raw ramps (sandy/, bayer/, gray/, amber/, red/) and semantic tokens (text/, bg/, border/, button/, icon/, field/, support/). Code should consume the semantic tokens — utilities mirror the Figma names."
        >
          <div className="flex flex-col gap-8">
            <TokenGroup label="Sandy (brand)">
              <Swatch name="sandy/50" className="bg-sandy-50" hex="#EEFFF1" />
              <Swatch name="sandy/100" className="bg-sandy-100" hex="#D7FFE0" />
              <Swatch name="sandy/200" className="bg-sandy-200" hex="#B2FFC3" />
              <Swatch name="sandy/300" className="bg-sandy-300" hex="#73F64A" />
              <Swatch name="sandy/400" className="bg-sandy-400" hex="#33F560" />
              <Swatch name="sandy/500" className="bg-sandy-500" hex="#09DE3A" />
              <Swatch name="sandy/600" className="bg-sandy-600" hex="#00B82B" />
              <Swatch name="sandy/700" className="bg-sandy-700" hex="#049126" />
              <Swatch name="sandy/800" className="bg-sandy-800" hex="#0A7123" />
              <Swatch name="sandy/900" className="bg-sandy-900" hex="#0A5D20" />
              <Swatch name="sandy/950" className="bg-sandy-950" hex="#00340E" />
            </TokenGroup>

            <TokenGroup label="Bayer (alt brand)">
              <Swatch name="bayer/200" className="bg-bayer-200" hex="#CAF69C" />
              <Swatch name="bayer/400" className="bg-bayer-400" hex="#9CD34F" />
              <Swatch name="bayer/600" className="bg-bayer-600" hex="#56A343" />
              <Swatch name="bayer/700" className="bg-bayer-700" hex="#458450" />
              <Swatch name="bayer/800" className="bg-bayer-800" hex="#306038" />
              <Swatch name="bayer/900" className="bg-bayer-900" hex="#1F4126" />
              <Swatch name="bayer/950" className="bg-bayer-950" hex="#0D2713" />
            </TokenGroup>

            <TokenGroup label="Neutrals & Gray">
              <Swatch
                name="neutral/900"
                className="bg-neutral-900"
                hex="#171717"
              />
              <Swatch
                name="neutral/950"
                className="bg-neutral-950"
                hex="#0A0A0A"
              />
              <Swatch name="gray/50" className="bg-gray-50" hex="#F9FAFB" />
              <Swatch name="gray/100" className="bg-gray-100" hex="#F3F4F6" />
              <Swatch name="gray/200" className="bg-gray-200" hex="#E2E8F0" />
              <Swatch name="gray/300" className="bg-gray-300" hex="#D1D5DB" />
              <Swatch name="gray/400" className="bg-gray-400" hex="#CBD5E1" />
              <Swatch name="gray/500" className="bg-gray-500" hex="#6B7280" />
              <Swatch name="gray/600" className="bg-gray-600" hex="#94A3B8" />
              <Swatch name="slate/100" className="bg-slate-100" hex="#F1F5F9" />
            </TokenGroup>

            <TokenGroup label="Support">
              <Swatch name="amber/50" className="bg-amber-50" hex="#FFFBEB" />
              <Swatch name="amber/600" className="bg-amber-600" hex="#D97706" />
              <Swatch name="red/50" className="bg-red-50" hex="#FEF2F2" />
              <Swatch name="red/600" className="bg-red-600" hex="#DC2626" />
              <Swatch
                name="orange/600"
                className="bg-orange-600"
                hex="#EA580C"
              />
            </TokenGroup>

            <TokenGroup label="Background (semantic)">
              <Swatch
                name="bg/primary"
                className="bg-bg-primary"
                hex="#FFFFFF"
              />
              <Swatch
                name="bg/secondary"
                className="bg-bg-secondary"
                hex="#F9FAFB"
              />
              <Swatch
                name="bg/tertiary"
                className="bg-bg-tertiary"
                hex="#F3F4F6"
              />
              <Swatch
                name="bg/selected"
                className="bg-bg-selected"
                hex="#B2FFC3"
              />
              <Swatch
                name="bg/brand-primary"
                className="bg-bg-brand-primary"
                hex="#00B82B"
              />
            </TokenGroup>

            <TokenGroup label="Border (semantic)">
              <Swatch
                name="border/primary"
                className="bg-border-primary"
                hex="#00B82B"
              />
              <Swatch
                name="border/primary-hover"
                className="bg-border-primary-hover"
                hex="#0A7123"
              />
              <Swatch
                name="border/primary-active"
                className="bg-border-primary-active"
                hex="#0A5D20"
              />
              <Swatch
                name="border/primary-focus"
                className="bg-border-primary-focus"
                hex="#33F560"
              />
              <Swatch
                name="border/secondary"
                className="bg-border-secondary"
                hex="#E2E8F0"
              />
              <Swatch
                name="border/secondary-hover"
                className="bg-border-secondary-hover"
                hex="#CBD5E1"
              />
              <Swatch
                name="border/secondary-active"
                className="bg-border-secondary-active"
                hex="#94A3B8"
              />
              <Swatch
                name="border/tertiary"
                className="bg-border-tertiary"
                hex="#F1F5F9"
              />
              <Swatch
                name="border/tertiary-hover"
                className="bg-border-tertiary-hover"
                hex="#E2E8F0"
              />
              <Swatch
                name="border/tertiary-active"
                className="bg-border-tertiary-active"
                hex="#CBD5E1"
              />
              <Swatch
                name="border/disabled"
                className="bg-border-disabled"
                hex="#CBD5E1"
              />
              <Swatch
                name="border/danger"
                className="bg-border-danger"
                hex="#DC2626"
              />
            </TokenGroup>

            <TokenGroup label="Button (semantic)">
              <Swatch
                name="button/primary"
                className="bg-button-primary"
                hex="#00B82B"
              />
              <Swatch
                name="button/primary-hover"
                className="bg-button-primary-hover"
                hex="#049126"
              />
              <Swatch
                name="button/primary-active"
                className="bg-button-primary-active"
                hex="#0A7123"
              />
              <Swatch
                name="button/secondary"
                className="bg-button-secondary"
                hex="#E2E8F0"
              />
              <Swatch
                name="button/secondary-hover"
                className="bg-button-secondary-hover"
                hex="#CBD5E1"
              />
              <Swatch
                name="button/secondary-active"
                className="bg-button-secondary-active"
                hex="#94A3B8"
              />
              <Swatch
                name="button/tertiary"
                className="bg-button-tertiary"
                hex="#F1F5F9"
              />
              <Swatch
                name="button/tertiary-hover"
                className="bg-button-tertiary-hover"
                hex="#E2E8F0"
              />
              <Swatch
                name="button/tertiary-active"
                className="bg-button-tertiary-active"
                hex="#CBD5E1"
              />
              <Swatch
                name="button/disabled"
                className="bg-button-disabled"
                hex="#CBD5E1"
              />
            </TokenGroup>

            <TokenGroup label="Support (callouts / alerts)">
              <Swatch
                name="support/bg-amber"
                className="bg-support-bg-amber"
                hex="#FFFBEB"
              />
              <Swatch
                name="support/fg-amber"
                className="bg-support-fg-amber"
                hex="#D97706"
              />
              <Swatch
                name="support/border-amber"
                className="bg-support-border-amber"
                hex="#D97706"
              />
              <Swatch
                name="support/bg-green"
                className="bg-support-bg-green"
                hex="#EEFFF1"
              />
              <Swatch
                name="support/fg-green"
                className="bg-support-fg-green"
                hex="#00B82B"
              />
              <Swatch
                name="support/bg-red"
                className="bg-support-bg-red"
                hex="#FEF2F2"
              />
              <Swatch
                name="support/fg-red"
                className="bg-support-fg-red"
                hex="#DC2626"
              />
            </TokenGroup>
          </div>
        </Section>

        <Section
          title="Typography"
          description="Overpass across the board — variable font, weights 100–900."
        >
          <div className="flex flex-col gap-5">
            <TypeRow
              label="Display-4 · text-2xl/9"
              className="text-2xl leading-9 font-semibold text-text-primary"
              sample="Data check"
            />
            <TypeRow
              label="Subhead-2 · text-lg/6"
              className="text-lg leading-6 text-text-primary"
              sample="Filter records with missing required data"
            />
            <TypeRow
              label="Body-1 · text-md/6"
              className="text-md leading-6 text-text-primary"
              sample="Please fill in the missing required data to create an accurate & complete report."
            />
            <TypeRow
              label="Body-secondary · text-sm"
              className="text-sm text-text-secondary"
              sample="Organisation name · Whispering Willow Farm"
            />
          </div>
        </Section>

        <Section
          title="Buttons"
          description="Primary, secondary and ghost variants — each with default, hover, active, focus and disabled states."
        >
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <span className="text-xs uppercase tracking-wider text-text-secondary">
                Primary
              </span>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="primary" leadingIcon={<IconPlus />}>
                  Sync report
                </Button>
                <Button variant="primary" leadingIcon={<IconPlus />} disabled>
                  Disabled
                </Button>
                <Button variant="primary" loading>
                  Loading
                </Button>
                <Button variant="primary">No icon</Button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-xs uppercase tracking-wider text-text-secondary">
                Secondary
              </span>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="secondary" leadingIcon={<IconPlus />}>
                  Add field
                </Button>
                <Button variant="secondary" disabled>
                  Disabled
                </Button>
                <Button variant="secondary" size="lg">
                  Large secondary
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-xs uppercase tracking-wider text-text-secondary">
                Ghost
              </span>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="ghost">All cropping data (24)</Button>
                <Button variant="ghost" leadingIcon={<IconPlus />}>
                  Add filter
                </Button>
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Sidebar icons"
          description="Inlined from the Figma source. All paths use currentColor."
        >
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            <IconCell name="collapse" icon={<IconMenuCollapse />} />
            <IconCell name="home" icon={<IconMenuHome />} />
            <IconCell name="farm" icon={<IconMenuFarm />} />
            <IconCell name="sustainability" icon={<IconMenuSustainability />} />
            <IconCell name="financial" icon={<IconMenuFinancial />} />
            <IconCell name="opportunities" icon={<IconMenuOpportunities />} />
            <IconCell name="utilities" icon={<IconMenuUtilities />} />
            <IconCell name="palette" icon={<IconPalette />} />
            <IconCell name="plus" icon={<IconPlus />} />
          </div>
        </Section>

        <Section
          title="Checkbox"
          description="Square check from the Figma source — secondary stroke when off, sandy-600 fill with white tick when on."
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-6">
              <Checkbox label="Default" />
              <Checkbox label="Checked" defaultChecked />
              <Checkbox label="Indeterminate" indeterminate />
              <Checkbox label="Disabled" disabled />
              <Checkbox label="Disabled + checked" disabled defaultChecked />
              <Checkbox label="Invalid" invalid />
            </div>
            <Checkbox
              label="Send me a copy of the report"
              description="We'll attach a PDF to the email address on your account."
            />
          </div>
        </Section>

        <Section
          title="Segmented control"
          description="Mutually exclusive toggle for switching between a small set of views (e.g. List vs Map). Built on Base UI's Toolbar for arrow-key navigation."
        >
          <SegmentedControlDemo />
        </Section>

        <Section
          title="Tabs"
          description="Use `<Tabs>` + `<TabBar>` + `<Tab>` + `<TabPanel>`. The TabBar can be passed to `AppHeader` via its `tabs` prop to render directly beneath the title row."
        >
          <Tabs defaultValue="accounts">
            <TabBar>
              <Tab value="overview">Natural capital overview</Tab>
              <Tab value="insights">Grower Insights</Tab>
              <Tab value="performance">Practice performance</Tab>
              <Tab value="accounts">NC Accounts</Tab>
              <Tab value="disabled" disabled>
                Disabled
              </Tab>
            </TabBar>
            <TabPanel value="overview" className="py-4 text-text-secondary">
              Overview panel content.
            </TabPanel>
            <TabPanel value="insights" className="py-4 text-text-secondary">
              Grower insights panel content.
            </TabPanel>
            <TabPanel value="performance" className="py-4 text-text-secondary">
              Practice performance panel content.
            </TabPanel>
            <TabPanel value="accounts" className="py-4 text-text-secondary">
              NC accounts panel content.
            </TabPanel>
          </Tabs>
        </Section>

        <Section
          title="Date picker"
          description="Built on react-day-picker (accessible, keyboard-navigable). Single date and date-range modes share the same trigger as the other form controls."
        >
          <div className="grid gap-6 md:grid-cols-2 max-w-3xl">
            <DatePicker label="Date" defaultValue={new Date(2026, 5, 17)} />
            <DatePicker
              label="Reporting period"
              mode="range"
              defaultValue={{
                from: new Date(2026, 0, 1),
                to: new Date(2026, 5, 30),
              }}
            />
            <DatePicker
              label="Required"
              required
              errorMessage="Select a date"
            />
            <DatePicker label="Disabled" disabled />
          </div>
        </Section>

        <Section
          title="Text input"
          description="Single-line text field with optional leading/trailing icons, helper, error and disabled states."
        >
          <div className="grid gap-6 md:grid-cols-2 max-w-3xl">
            <TextInput label="Organisation" placeholder="Whispering Willow" />
            <TextInput
              label="Search"
              placeholder="Search by name"
              leadingIcon={<IconSearch />}
            />
            <TextInput
              label="Field area"
              placeholder="0"
              hint="ha"
              defaultValue="12.5"
            />
            <TextInput
              label="Email"
              type="email"
              placeholder="you@example.com"
              description="We'll never share this."
            />
            <TextInput
              label="Required"
              placeholder="Cannot be empty"
              errorMessage="Required"
            />
            <TextInput
              label="Disabled"
              placeholder="Read-only value"
              defaultValue="Locked"
              disabled
            />
          </div>
        </Section>

        <Section
          title="Select"
          description="Single + multi-select, optional search filter, optional grouped options. Built on Base UI for full keyboard a11y."
        >
          <div className="grid gap-6 md:grid-cols-2 max-w-3xl">
            <Select
              label="Year"
              placeholder="Select year"
              defaultValue="2024"
              items={[
                { value: '2024', label: '2024' },
                { value: '2023', label: '2023' },
                { value: '2022', label: '2022' },
                { value: '2021', label: '2021' },
              ]}
            />
            <Select
              label="Crop"
              placeholder="Select crop"
              searchable
              defaultValue="oilseed"
              items={
                [
                  { value: 'maize', label: 'Maize' },
                  { value: 'wheat', label: 'Wheat' },
                  { value: 'barley', label: 'Barley' },
                  {
                    value: 'oilseed',
                    label: 'Winter oilseed rape',
                    hint: '5 fields',
                  },
                  { value: 'oats', label: 'Winter oats' },
                  { value: 'peas', label: 'Round peas' },
                  { value: 'carrot', label: 'Carrot' },
                  { value: 'potato', label: 'Potatoes maincrop' },
                ] satisfies SelectOption[]
              }
            />
            <MultiSelect
              label="Organisations"
              placeholder="Select organisations"
              searchable
              items={
                [
                  { value: 'all', label: 'All organisations' },
                  { value: 'org-a', label: 'Whispering Willow Farm Ltd.' },
                  { value: 'org-b', label: 'Amber Harvest Co-op' },
                  { value: 'org-c', label: 'Foxglove Hill Estates' },
                  { value: 'org-d', label: 'Brookside Leys' },
                  { value: 'org-e', label: 'Sodepa Farming' },
                ] satisfies SelectOption[]
              }
            />
            <MultiSelect
              label="Fields (grouped, selectable groups)"
              placeholder="Select fields"
              searchable
              selectableGroups
              items={
                [
                  {
                    label: 'Whispering Willow Farm',
                    options: [
                      { value: 'wwf-1', label: 'Top meadow', hint: '4.2 ha' },
                      { value: 'wwf-2', label: 'Long acre', hint: '6.8 ha' },
                      { value: 'wwf-3', label: 'Spinney', hint: '2.1 ha' },
                    ],
                  },
                  {
                    label: 'Amber Harvest Farm',
                    options: [
                      { value: 'ahf-1', label: 'River bend', hint: '3.6 ha' },
                      { value: 'ahf-2', label: 'South ridge', hint: '5.0 ha' },
                    ],
                  },
                ] satisfies SelectGroupType[]
              }
            />
            <Select
              label="Disabled"
              placeholder="Select"
              disabled
              items={[{ value: 'x', label: 'X' }]}
            />
            <Select
              label="Error"
              placeholder="Select organisation"
              errorMessage="Required"
              items={[
                { value: 'a', label: 'Option A' },
                { value: 'b', label: 'Option B' },
              ]}
            />
          </div>
        </Section>

        <Section
          title="Radio"
          description="16px circular target — must be wrapped in a RadioGroup. Includes default, hover, disabled and invalid styling."
        >
          <div className="flex flex-col gap-8">
            <RadioGroup
              defaultValue="planting"
              label="Report scope"
              description="Pick one option."
            >
              <Radio
                value="planting"
                label="Planting & harvesting"
                description="Cropping data only."
              />
              <Radio
                value="operational"
                label="Operational"
                description="Inputs, tasks and field activity."
              />
              <Radio value="all" label="Full year (everything)" />
            </RadioGroup>

            <RadioGroup
              defaultValue="b"
              label="Inline group"
              orientation="horizontal"
            >
              <Radio value="a" label="Option A" />
              <Radio value="b" label="Option B" />
              <Radio value="c" label="Option C" />
            </RadioGroup>

            <RadioGroup defaultValue="off" label="Disabled / invalid" disabled>
              <Radio value="off" label="Disabled (off)" />
              <Radio value="on" label="Disabled (on)" />
            </RadioGroup>

            <RadioGroup defaultValue="invalid">
              <Radio value="invalid" label="Invalid state" invalid />
              <Radio value="other" label="Sibling" invalid />
            </RadioGroup>
          </div>
        </Section>

        <Section
          title="Badge"
          description="Generic label chip. Unified `rounded-md` radius across all sizes; tone drives the colour pair, size drives padding + type + icon scale. Pair with a trend icon for the chip-status / chip-trend use cases."
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-4">
              <Badge tone="green" size="sm" icon={<IconTrendUp />}>
                170%
              </Badge>
              <Badge tone="green" icon={<IconTrendUp />}>
                32%
              </Badge>
              <Badge tone="green" size="lg" icon={<IconTrendUp />}>
                32%
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Badge tone="red" size="sm" icon={<IconTrendDown />}>
                8%
              </Badge>
              <Badge tone="red" icon={<IconTrendDown />}>
                15%
              </Badge>
              <Badge tone="red" size="lg" icon={<IconTrendDown />}>
                15%
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Badge size="sm">Draft</Badge>
              <Badge>Pending review</Badge>
              <Badge size="lg">Archived</Badge>
            </div>
          </div>
        </Section>

        <Section
          title="Stat card"
          description="Headline-metric card from the Sandy CPG screen. Icon + label up top, large value + unit below, optional trailing `Badge` and an up-and-right link arrow."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Growers"
              icon={<IconMenuFarm />}
              value="142"
              unit="growers"
            />
            <StatCard
              label="Area"
              icon={<IconMap />}
              value="108,966"
              unit="acre"
            />
            <StatCard
              label="Total production"
              icon={<IconMenuSustainability />}
              value="216,780"
              unit="t"
              badge={
                <Badge tone="green" size="lg" icon={<IconTrendUp />}>
                  32%
                </Badge>
              }
              hasLink
            />
            <StatCard
              label="Investment"
              icon={<IconMenuFinancial />}
              value="$2M"
              unit="(2 programs)"
              hasLink
            />
          </div>
        </Section>
      </div>
    </AppShell>
  )
}
