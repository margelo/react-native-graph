import type { LineGraphProps } from '../LineGraphProps';

const points = [
  { value: 1, date: new Date('2026-01-01T00:00:00.000Z') },
  { value: 2, date: new Date('2026-01-02T00:00:00.000Z') },
];

function acceptLineGraphProps(props: LineGraphProps): LineGraphProps {
  return props;
}

describe('LineGraphProps', () => {
  it('defaults to the static graph when animated is omitted', () => {
    const props = acceptLineGraphProps({ points, color: '#4484B2' });

    expect(props.animated).toBeUndefined();
  });

  it('accepts animated renderer props with animated=true', () => {
    const props = acceptLineGraphProps({
      points,
      color: '#4484B2',
      animated: true,
      enablePanGesture: true,
    });

    expect(props.animated).toBe(true);
  });
});
