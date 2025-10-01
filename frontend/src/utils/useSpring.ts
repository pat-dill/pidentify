import { useEffect, useRef, useState } from "react";
import { useAnimationFrame } from "./useAnimationFrame";

const getSeconds = () => new Date().valueOf() / 1000;

const EPSILON = 0.001;

interface Spring {
  prevDisplacement: number;
  prevVelocity: number;
  goal: number;
  displacement: number;
  position: number;
  velocity: number;
  lastUpdate: number;
  damping: number;
  speed: number;
}

function springCoefficients(time: number, damping: number, speed: number) {
  // if time or speed is 0, then the spring won't move
  if (time === 0 || speed === 0) {
    return [1, 0, 0, 1];
  }
  let posPos, posVel, velPos, velVel;

  if (damping > 1) {
    // overdamped spring
    // solution to the characteristic equation:
    // z = -ζω ± Sqrt[ζ^2 - 1] ω
    // x[t] -> x0(e^(t z2) z1 - e^(t z1) z2)/(z1 - z2)
    //		 + v0(e^(t z1) - e^(t z2))/(z1 - z2)
    // v[t] -> x0(z1 z2(-e^(t z1) + e^(t z2)))/(z1 - z2)
    //		 + v0(z1 e^(t z1) - z2 e^(t z2))/(z1 - z2)

    const scaledTime = time * speed;
    const alpha = Math.sqrt(damping ** 2 - 1);
    const scaledInvAlpha = -0.5 / alpha;
    const z1 = -alpha - damping;
    const z2 = 1 / z1;
    const expZ1 = Math.exp(scaledTime * z1);
    const expZ2 = Math.exp(scaledTime * z2);

    posPos = (expZ2 * z1 - expZ1 * z2) * scaledInvAlpha;
    posVel = ((expZ1 - expZ2) * scaledInvAlpha) / speed;
    velPos = (expZ2 - expZ1) * scaledInvAlpha * speed;
    velVel = (expZ1 * z1 - expZ2 * z2) * scaledInvAlpha;
  } else if (damping === 1) {
    // critically damped spring
    // x[t] -> x0(e^-tω)(1+tω) + v0(e^-tω)t
    // v[t] -> x0(t ω^2)(-e^-tω) + v0(1 - tω)(e^-tω)

    const scaledTime = time * speed;
    const expTerm = Math.exp(-scaledTime);

    posPos = expTerm * (1 + scaledTime);
    posVel = expTerm * time;
    velPos = expTerm * (-scaledTime * speed);
    velVel = expTerm * (1 - scaledTime);
  } else {
    // underdamped spring
    // factored out of the solutions to the characteristic equation:
    // α = Sqrt[1 - ζ^2]
    // x[t] -> x0(e^-tζω)(α Cos[tα] + ζω Sin[tα])/α
    //       + v0(e^-tζω)(Sin[tα])/α
    // v[t] -> x0(-e^-tζω)(α^2 + ζ^2 ω^2)(Sin[tα])/α
    //       + v0(e^-tζω)(α Cos[tα] - ζω Sin[tα])/α

    const scaledTime = time * speed;
    const alpha = Math.sqrt(1 - damping ** 2);
    const invAlpha = 1 / alpha;
    const alphaTime = alpha * scaledTime;
    const expTerm = Math.exp(-scaledTime * damping);
    const sinTerm = expTerm * Math.sin(alphaTime);
    const cosTerm = expTerm * Math.cos(alphaTime);
    const sinInvAlpha = sinTerm * invAlpha;
    const sinInvAlphaDamp = sinInvAlpha * damping;

    posPos = sinInvAlphaDamp + cosTerm;
    posVel = sinInvAlpha;
    velPos = -(sinInvAlphaDamp * damping + sinTerm * alpha);
    velVel = cosTerm - sinInvAlphaDamp;
  }

  return [posPos, posVel, velPos, velVel];
}

export function useSpring(
  goal: number,
  damping: number = 1,
  speed: number = 10,
) {
  const [position, setPosition] = useState(goal);
  const springRef = useRef<Spring>({
    prevDisplacement: 0,
    prevVelocity: 0,
    velocity: 0,
    displacement: 0,
    position: goal,
    goal,
    damping,
    speed,
    lastUpdate: getSeconds(),
  });
  const spring = springRef.current;
  const requestRef = useRef<number>(undefined!);

  const animate = () => {
    const [posPos, posVel, velPos, velVel] = springCoefficients(
      getSeconds() - spring.lastUpdate,
      spring.damping,
      spring.speed,
    );

    if (
      Math.abs(spring.displacement) <= EPSILON &&
      Math.abs(spring.velocity) <= EPSILON
    ) {
      if (spring.displacement > 0 || spring.velocity > 0) {
        setPosition(spring.position);
      }
      spring.velocity = 0;
      spring.displacement = 0;
      spring.position = spring.goal;
    } else {
      spring.velocity =
        spring.prevDisplacement * velPos + spring.prevVelocity * velVel;
      spring.displacement =
        spring.prevDisplacement * posPos + spring.prevVelocity * posVel;
      spring.position = spring.goal + spring.displacement;
      setPosition(spring.position);
    }

    spring.prevVelocity = spring.velocity;
    spring.prevDisplacement = spring.displacement;
    spring.lastUpdate = getSeconds();

    requestRef.current = requestAnimationFrame(animate);
  };

  // useEffect(() => {
  spring.prevDisplacement = spring.displacement = spring.position - goal;
  spring.goal = goal;
  spring.speed = speed;
  spring.damping = damping;
  // }, [goal, speed, damping]);

  useAnimationFrame(animate);

  return position;
}
