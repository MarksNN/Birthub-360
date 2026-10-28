import { Bot, Database, Shield, Sparkles } from 'lucide-react';
import { Badge } from './Badge.js';
import { Button } from './Button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './Card.js';
import { Input } from './Input.js';
import { AnimatedIcon } from './icons/AnimatedIcon.js';

export function StyleShowcase() {
  return (
    <div className="p-8 space-y-12 max-w-5xl mx-auto bg-bg min-h-screen">
      <div>
        <h1 className="text-3xl font-display font-bold text-ink">Design System Showcase</h1>
        <p className="text-ink-2 mt-2">BirthHub 360 - Intelligent Business Command Center</p>
      </div>

      {/* Buttons */}
      <section>
        <h2 className="text-xl font-bold text-ink mb-4 border-b border-line pb-2">Buttons</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="default">Primary Action (Gold)</Button>
          <Button variant="primary">Brand Action (Navy)</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
      </section>

      {/* Inputs */}
      <section>
        <h2 className="text-xl font-bold text-ink mb-4 border-b border-line pb-2">
          Inputs & Forms
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="standard-input" className="text-sm font-semibold text-ink">
              Standard Input
            </label>
            <Input id="standard-input" placeholder="Enter your data..." />
          </div>
          <div className="space-y-2">
            <label htmlFor="standard-input" className="text-sm font-semibold text-ink">
              Error Input
            </label>
            <Input id="error-input" placeholder="Enter your data..." error />
          </div>
        </div>
      </section>

      {/* Badges */}
      <section>
        <h2 className="text-xl font-bold text-ink mb-4 border-b border-line pb-2">
          Badges & Status
        </h2>
        <div className="flex flex-wrap gap-4">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="success">Success Status</Badge>
          <Badge variant="warning">Warning Status</Badge>
          <Badge variant="info">Info Status</Badge>
          <Badge variant="destructive">Critical Error</Badge>
        </div>
      </section>

      {/* Cards */}
      <section>
        <h2 className="text-xl font-bold text-ink mb-4 border-b border-line pb-2">
          Cards & Surfaces
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Standard Panel</CardTitle>
              <CardDescription>Default surface elevation</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-ink-2">
                Used for grouping related information within the command center.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-surface-subtle">
            <CardHeader>
              <CardTitle>Subtle Panel</CardTitle>
              <CardDescription>Recessed surface</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-ink-2">
                Used for nested or secondary information grouping.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Icons & Motion */}
      <section>
        <h2 className="text-xl font-bold text-ink mb-4 border-b border-line pb-2">
          Icons & Motion
        </h2>
        <div className="flex flex-wrap gap-8 items-center">
          <AnimatedIcon icon={Bot} size="xl" animation="float" color="brand" badge />
          <AnimatedIcon icon={Sparkles} size="lg" animation="pulse" color="info" />
          <AnimatedIcon icon={Database} size="lg" animation="none" color="ink" badge />
          <AnimatedIcon icon={Shield} size="lg" animation="none" color="success" />
        </div>
      </section>
    </div>
  );
}
