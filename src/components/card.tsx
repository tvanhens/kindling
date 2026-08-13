import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ComponentPropsWithoutRef, ElementType, ReactNode, Ref } from "react";

import { prefers } from "~/styles/breakpoints.stylex";
import { color, motion, radius, shadow, space } from "~/styles/tokens.stylex";
import { pad } from "./box";
import type { SpaceToken } from "./box";

const styles = stylex.create({
  root: {
    borderColor: color.border,
    borderRadius: radius.lg,
    borderStyle: "solid",
    borderWidth: 1,
    backgroundColor: color.surface,
    color: color.text,
    display: "flex",
    flexDirection: "column",
    position: "relative",
    minWidth: 0,
  },
  interactive: {
    boxShadow: { default: shadow.sm, ":hover": shadow.md },
    cursor: "pointer",
    outlineColor: color.focusRing,
    outlineOffset: 2,
    outlineStyle: { default: "none", ":focus-visible": "solid" },
    outlineWidth: 2,
    transform: { default: "none", ":hover": "translateY(-1px)" },
    transitionDuration: { default: motion.base, [prefers.reducedMotion]: "0s" },
    transitionProperty: "box-shadow, border-color, transform",
    transitionTimingFunction: motion.easeOut,
  },
  divider: {
    borderBlockStartColor: color.border,
    borderBlockStartStyle: "solid",
    borderBlockStartWidth: 1,
    marginBlockStart: space.lg,
    paddingBlockStart: space.lg,
  },
  section: {
    gap: space.xs,
    display: "flex",
    flexDirection: "column",
  },
});

const elevations = stylex.create({
  none: { boxShadow: shadow.none },
  sm: { boxShadow: shadow.sm },
  md: { boxShadow: shadow.md },
  lg: { boxShadow: shadow.lg },
});

export type CardElevation = keyof typeof elevations;

export type CardOwnProps = {
  as?: ElementType;
  children?: ReactNode;
  elevation?: CardElevation;
  /** Adds hover lift + focus ring. Use for cards that are links or buttons. */
  interactive?: boolean;
  padding?: SpaceToken;
  ref?: Ref<HTMLDivElement>;
  style?: StyleXStyles;
};

export type CardProps = CardOwnProps &
  Omit<ComponentPropsWithoutRef<"div">, keyof CardOwnProps | "className">;

/** A raised surface. The default container for forms, panels and list items. */
export function Card({
  as: Component = "div",
  children,
  elevation = "sm",
  interactive = false,
  padding = "xl",
  ref,
  style,
  ...rest
}: CardProps) {
  return (
    <Component
      ref={ref}
      {...rest}
      {...stylex.props(
        styles.root,
        elevations[elevation],
        pad[padding],
        interactive && styles.interactive,
        style,
      )}
    >
      {children}
    </Component>
  );
}

export type CardSectionProps = {
  children?: ReactNode;
  /** Draws a hairline above the section -- for card footers. */
  divider?: boolean;
  style?: StyleXStyles;
};

/**
 * Optional grouping inside a `Card`. Use `divider` on the last section to get a
 * footer rule that lines up with the card padding.
 */
export function CardSection({ children, divider = false, style }: CardSectionProps) {
  return <div {...stylex.props(styles.section, divider && styles.divider, style)}>{children}</div>;
}
