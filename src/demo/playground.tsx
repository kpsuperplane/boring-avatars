import { useEffect, useMemo, useState } from 'react';
import Avatar, { type AvatarActivity, type AvatarVariant } from '../lib';

const SIZES = [24, 40, 96, 160] as const;
const ACTIVITIES: AvatarActivity[] = ['idle', 'listening', 'thinking', 'speaking'];
const VARIANTS: AvatarVariant[] = ['marble', 'beam'];
const SIMULATION = [0.08, 0.22, 0.48, 0.81, 0.58, 0.94, 0.36, 0.16, 0.67, 0.42];
const DEFAULT_PALETTE = ['#8f9cf4', '#4d64c9', '#f4b860', '#dd6e8b', '#25224a'];

const Segment = <T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T;
  onChange: (value: T) => void;
}) => (
  <div className="segment">
    {options.map((option) => (
      <button
        type="button"
        className={option === value ? 'selected' : ''}
        onClick={() => onChange(option)}
        key={option}
      >
        {option}
      </button>
    ))}
  </div>
);

export const Playground = () => {
  const benchmark = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedInstances = Number.parseInt(params.get('instances') ?? '', 10);
    const instances = Number.isFinite(requestedInstances)
      ? Math.min(100, Math.max(1, requestedInstances))
      : null;
    const requestedActivity = params.get('activity');
    return {
      instances,
      name: params.get('name') ?? 'Clara Barton',
      activity: ACTIVITIES.includes(requestedActivity as AvatarActivity)
        ? (requestedActivity as AvatarActivity)
        : 'idle',
      animated: params.get('animated') !== 'false',
      variant: params.get('variant') === 'beam' ? 'beam' : 'marble',
    } as const;
  }, []);
  const previewSizes = benchmark.instances
    ? Array.from({ length: benchmark.instances }, () => 96)
    : SIZES;
  const [name, setName] = useState(benchmark.name);
  const [colors, setColors] = useState(DEFAULT_PALETTE);
  const [variant, setVariant] = useState<AvatarVariant>(benchmark.variant);
  const [activity, setActivity] = useState<AvatarActivity>(benchmark.activity);
  const [animated, setAnimated] = useState(benchmark.animated);
  const [square, setSquare] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0.48);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (!simulating) return;

    let step = 0;
    let timeout = 0;
    const advance = () => {
      setAudioLevel(SIMULATION[step % SIMULATION.length]);
      step += 1;
      timeout = window.setTimeout(advance, 190);
    };
    advance();
    return () => window.clearTimeout(timeout);
  }, [simulating]);

  const updateColor = (index: number, value: string) => {
    setColors((current) => current.map((color, colorIndex) => (colorIndex === index ? value : color)));
  };

  return (
    <main>
      <header className="intro">
        <p className="eyebrow">@kpsuperplane/boring-avatars</p>
        <h1>Motion playground</h1>
        <p>Deterministic SVG identities with expressive, state-driven motion.</p>
      </header>

      <section className="workspace">
        <aside className="controls" aria-label="Avatar controls">
          <label>
            <span>Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>

          <fieldset>
            <legend>Palette</legend>
            <div className="palette">
              {colors.map((color, index) => (
                <label className="color-control" key={index} title={`Color ${index + 1}`}>
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => updateColor(index, event.target.value)}
                  />
                  <span>{color}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Variant</legend>
            <Segment options={VARIANTS} value={variant} onChange={setVariant} />
          </fieldset>

          <fieldset>
            <legend>Activity</legend>
            <Segment options={ACTIVITIES} value={activity} onChange={setActivity} />
          </fieldset>

          <label className="range-control">
            <span>
              Audio level <output>{audioLevel.toFixed(2)}</output>
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={audioLevel}
              onChange={(event) => {
                setSimulating(false);
                setAudioLevel(Number(event.target.value));
              }}
            />
          </label>

          <div className="button-row">
            <button type="button" className="action" onClick={() => setSimulating((value) => !value)}>
              {simulating ? 'Stop level simulation' : 'Start level simulation'}
            </button>
          </div>

          <div className="toggle-row">
            <label>
              <input
                type="checkbox"
                checked={animated}
                onChange={(event) => setAnimated(event.target.checked)}
              />
              Animated
            </label>
            <label>
              <input
                type="checkbox"
                checked={square}
                onChange={(event) => setSquare(event.target.checked)}
              />
              Square mask
            </label>
          </div>
          <p className="hint">The simulator repeats the same level sequence. System reduced-motion settings always win.</p>
        </aside>

        <section className="previews" aria-label="Avatar previews">
          {previewSizes.map((size, index) => (
            <article className="preview" key={`${size}-${index}`}>
              <div className="avatar-stage">
                <Avatar
                  name={name}
                  colors={colors}
                  variant={variant}
                  activity={activity}
                  audioLevel={audioLevel}
                  animated={animated}
                  square={square}
                  size={size}
                  title
                />
              </div>
              <p>{size}px</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
};
