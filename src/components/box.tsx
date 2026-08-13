import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ComponentPropsWithoutRef, ElementType, ReactNode, Ref } from "react";

import { color, radius, shadow, space } from "~/styles/tokens.stylex";

/**
 * The one place raw token maps live. Every other primitive composes these, so
 * padding / radius / elevation stay on-scale across the whole app.
 *
 * Each is a `stylex.create` namespace keyed by token name: StyleX compiles
 * every branch to its own atomic class, so indexing them costs nothing at
 * runtime and unused branches are still emitted only once.
 */
export const pad = stylex.create({
  none: { padding: space.none },
  xxs: { padding: space.xxs },
  xs: { padding: space.xs },
  sm: { padding: space.sm },
  md: { padding: space.md },
  lg: { padding: space.lg },
  xl: { padding: space.xl },
  xxl: { padding: space.xxl },
  xxxl: { padding: space.xxxl },
  huge: { padding: space.huge },
});

export const padX = stylex.create({
  none: { paddingInline: space.none },
  xxs: { paddingInline: space.xxs },
  xs: { paddingInline: space.xs },
  sm: { paddingInline: space.sm },
  md: { paddingInline: space.md },
  lg: { paddingInline: space.lg },
  xl: { paddingInline: space.xl },
  xxl: { paddingInline: space.xxl },
  xxxl: { paddingInline: space.xxxl },
  huge: { paddingInline: space.huge },
});

export const padY = stylex.create({
  none: { paddingBlock: space.none },
  xxs: { paddingBlock: space.xxs },
  xs: { paddingBlock: space.xs },
  sm: { paddingBlock: space.sm },
  md: { paddingBlock: space.md },
  lg: { paddingBlock: space.lg },
  xl: { paddingBlock: space.xl },
  xxl: { paddingBlock: space.xxl },
  xxxl: { paddingBlock: space.xxxl },
  huge: { paddingBlock: space.huge },
});

export const gaps = stylex.create({
  none: { gap: space.none },
  xxs: { gap: space.xxs },
  xs: { gap: space.xs },
  sm: { gap: space.sm },
  md: { gap: space.md },
  lg: { gap: space.lg },
  xl: { gap: space.xl },
  xxl: { gap: space.xxl },
  xxxl: { gap: space.xxxl },
  huge: { gap: space.huge },
});

export const rounded = stylex.create({
  none: { borderRadius: radius.none },
  sm: { borderRadius: radius.sm },
  md: { borderRadius: radius.md },
  lg: { borderRadius: radius.lg },
  xl: { borderRadius: radius.xl },
  xxl: { borderRadius: radius.xxl },
  pill: { borderRadius: radius.pill },
});

export const elevations = stylex.create({
  none: { boxShadow: shadow.none },
  sm: { boxShadow: shadow.sm },
  md: { boxShadow: shadow.md },
  lg: { boxShadow: shadow.lg },
  inset: { boxShadow: shadow.inset },
});

export const surfaces = stylex.create({
  none: {},
  backdrop: { backgroundColor: color.backdrop },
  surface: { backgroundColor: color.surface },
  sunken: { backgroundColor: color.surfaceSunken },
});

export type SpaceToken = keyof typeof pad;
export type RadiusToken = keyof typeof rounded;
export type ShadowToken = keyof typeof elevations;
export type SurfaceToken = keyof typeof surfaces;

const styles = stylex.create({
  bordered: {
    borderColor: color.border,
    borderStyle: "solid",
    borderWidth: 1,
  },
});

export type BoxOwnProps = {
  /** Render as a different element -- `section`, `main`, `label`, ... */
  as?: ElementType;
  background?: SurfaceToken;
  border?: boolean;
  children?: ReactNode;
  elevation?: ShadowToken;
  padding?: SpaceToken;
  /** Inline (left/right) padding. Wins over `padding`. */
  paddingX?: SpaceToken;
  /** Block (top/bottom) padding. Wins over `padding`. */
  paddingY?: SpaceToken;
  radius?: RadiusToken;
  ref?: Ref<HTMLElement>;
  /** Extra StyleX styles from the caller; always applied last. */
  style?: StyleXStyles;
};

export type BoxProps = BoxOwnProps &
  Omit<ComponentPropsWithoutRef<"div">, keyof BoxOwnProps | "className">;

/**
 * The generic layout atom: token-scoped padding, background, radius, border and
 * elevation on any element. Anything it does not cover goes through `style`.
 */
export function Box({
  as: Component = "div",
  background = "none",
  border = false,
  children,
  elevation = "none",
  padding,
  paddingX,
  paddingY,
  radius: radiusToken,
  ref,
  style,
  ...rest
}: BoxProps) {
  return (
    <Component
      ref={ref}
      {...rest}
      {...stylex.props(
        surfaces[background],
        border && styles.bordered,
        padding !== undefined && pad[padding],
        paddingX !== undefined && padX[paddingX],
        paddingY !== undefined && padY[paddingY],
        radiusToken !== undefined && rounded[radiusToken],
        elevations[elevation],
        style,
      )}
    >
      {children}
    </Component>
  );
}
