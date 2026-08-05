"""
VISIORA — Quiz Bank
⚠️ IMPORTANT: This file requires Akshay's manual sign-off before it can be merged into production.
All questions, answer keys, and explanations must be reviewed for pedagogical accuracy.
"""

QUIZ_BANK = {
    "gravity": [
        {
            "id": "g1",
            "question": "If you drop a heavy rock and a light feather in a vacuum, which hits the ground first?",
            "options": ["The heavy rock", "The light feather", "They hit at the same time", "It depends on the drop height"],
            "correct_index": 2,
            "explanation": "In a vacuum, there is no air resistance. Gravity accelerates all objects at the same rate, regardless of mass."
        },
        {
            "id": "g2",
            "question": "What is the approximate acceleration due to gravity on Earth?",
            "options": ["9.81 m/s²", "1.62 m/s²", "3.14 m/s²", "100 m/s²"],
            "correct_index": 0,
            "explanation": "The standard acceleration due to gravity at Earth's surface is approximately 9.81 m/s²."
        },
        {
            "id": "g3",
            "question": "If you throw a ball straight up, what is its acceleration at the highest point?",
            "options": ["0 m/s²", "9.81 m/s² downwards", "9.81 m/s² upwards", "Depends on the initial velocity"],
            "correct_index": 1,
            "explanation": "Even when the velocity is zero at the highest point, gravity is still pulling it downwards at 9.81 m/s²."
        },
        {
            "id": "g4",
            "question": "How does distance affect the gravitational force between two objects?",
            "options": ["Force increases with distance", "Force decreases as the square of the distance", "Force decreases linearly", "Distance has no effect"],
            "correct_index": 1,
            "explanation": "According to Newton's Law of Universal Gravitation, force is inversely proportional to the square of the distance between their centers."
        },
        {
            "id": "g5",
            "question": "Which of these determines the gravitational pull of a planet?",
            "options": ["Its temperature", "Its mass and radius", "Its atmosphere", "Its color"],
            "correct_index": 1,
            "explanation": "Gravitational pull depends on the mass of the planet and the distance from its center (radius)."
        }
    ],
    "projectile": [
        {
            "id": "p1",
            "question": "At what angle should you launch a projectile to achieve maximum range on flat ground (ignoring air resistance)?",
            "options": ["30 degrees", "45 degrees", "60 degrees", "90 degrees"],
            "correct_index": 1,
            "explanation": "45 degrees provides the optimal balance between horizontal velocity and time in the air."
        },
        {
            "id": "p2",
            "question": "Which component of a projectile's velocity remains constant in a vacuum?",
            "options": ["Vertical velocity", "Horizontal velocity", "Total velocity", "Neither"],
            "correct_index": 1,
            "explanation": "Gravity only affects the vertical component. Without air resistance, horizontal velocity remains constant."
        },
        {
            "id": "p3",
            "question": "If a bullet is dropped and another is fired horizontally from the same height at the same time, which hits the ground first?",
            "options": ["The dropped bullet", "The fired bullet", "They hit at the same time", "Depends on the firing speed"],
            "correct_index": 2,
            "explanation": "Vertical and horizontal motions are independent. Both fall from the same height under the same gravity."
        },
        {
            "id": "p4",
            "question": "What is the shape of a projectile's trajectory (without air resistance)?",
            "options": ["Circle", "Straight line", "Parabola", "Hyperbola"],
            "correct_index": 2,
            "explanation": "The combination of constant horizontal velocity and constant vertical acceleration creates a parabolic path."
        },
        {
            "id": "p5",
            "question": "At the highest point of a projectile's trajectory, its vertical velocity is:",
            "options": ["Maximum", "Zero", "Equal to its horizontal velocity", "9.81 m/s"],
            "correct_index": 1,
            "explanation": "The projectile stops rising and begins to fall at its peak, meaning vertical velocity is exactly zero for an instant."
        }
    ],
    "pendulum": [
        {
            "id": "pen1",
            "question": "If you double the mass of a pendulum bob, how does its period change?",
            "options": ["It doubles", "It halves", "It stays the same", "It increases by sqrt(2)"],
            "correct_index": 2,
            "explanation": "The period of a simple pendulum depends only on its length and gravity, not on its mass."
        },
        {
            "id": "pen2",
            "question": "How can you increase the period (time for one swing) of a pendulum?",
            "options": ["Increase its mass", "Decrease its length", "Increase its length", "Push it harder"],
            "correct_index": 2,
            "explanation": "The period is proportional to the square root of its length. A longer string means a longer period."
        },
        {
            "id": "pen3",
            "question": "Where does a pendulum have the most kinetic energy?",
            "options": ["At the highest points", "At the lowest point (equilibrium)", "Halfway down", "It's constant everywhere"],
            "correct_index": 1,
            "explanation": "At the lowest point, all its potential energy has been converted to kinetic energy, so it moves the fastest."
        },
        {
            "id": "pen4",
            "question": "If you take a pendulum to the Moon (where gravity is weaker), what happens to its period?",
            "options": ["It increases (swings slower)", "It decreases (swings faster)", "It stays the same", "It stops swinging"],
            "correct_index": 0,
            "explanation": "Weaker gravity means less restoring force, so it takes longer to complete a swing."
        },
        {
            "id": "pen5",
            "question": "What provides the restoring force for a pendulum?",
            "options": ["Tension in the string", "Air resistance", "Gravity", "The mass of the bob"],
            "correct_index": 2,
            "explanation": "The component of gravity pulling tangent to the arc is what pulls the bob back toward the center."
        }
    ],
    "collision": [
        {
            "id": "c1",
            "question": "In a perfectly inelastic collision, what is conserved?",
            "options": ["Both momentum and kinetic energy", "Only momentum", "Only kinetic energy", "Neither"],
            "correct_index": 1,
            "explanation": "In perfectly inelastic collisions, objects stick together. Kinetic energy is lost (converted to heat/sound), but total momentum is always conserved."
        },
        {
            "id": "c2",
            "question": "In an elastic collision, what happens to kinetic energy?",
            "options": ["It is destroyed", "It is converted to heat", "It is completely conserved", "It is doubled"],
            "correct_index": 2,
            "explanation": "By definition, an elastic collision is one where no kinetic energy is lost."
        },
        {
            "id": "c3",
            "question": "A heavy truck and a small car collide head-on. Which experiences the greater force?",
            "options": ["The truck", "The car", "The forces are equal and opposite", "Depends on their speeds"],
            "correct_index": 2,
            "explanation": "Newton's Third Law states that every action has an equal and opposite reaction. The forces are identical (though the effects are very different due to mass!)."
        },
        {
            "id": "c4",
            "question": "What is momentum?",
            "options": ["Mass times acceleration", "Mass times velocity", "Force times time", "Energy divided by time"],
            "correct_index": 1,
            "explanation": "Momentum (p) is defined as an object's mass (m) multiplied by its velocity (v)."
        },
        {
            "id": "c5",
            "question": "Why do cars have crumple zones?",
            "options": ["To conserve momentum", "To increase the collision time, reducing the force", "To decrease the collision time", "To bounce off other cars"],
            "correct_index": 1,
            "explanation": "A longer collision time means a smaller average force is required to stop the car (Impulse = Force * time)."
        }
    ],
    "angular": [
        {
            "id": "a1",
            "question": "Why does a spinning ice skater rotate faster when they pull their arms in?",
            "options": ["Their mass decreases", "Conservation of angular momentum", "Friction with the ice decreases", "Gravity pulls them tighter"],
            "correct_index": 1,
            "explanation": "By pulling their arms in, they decrease their moment of inertia. To conserve angular momentum (L = I * w), their angular velocity (w) must increase."
        },
        {
            "id": "a2",
            "question": "What is the rotational equivalent of mass?",
            "options": ["Torque", "Angular velocity", "Moment of inertia", "Angular momentum"],
            "correct_index": 2,
            "explanation": "Moment of inertia represents how difficult it is to change an object's rotational speed, just as mass resists changes in linear speed."
        },
        {
            "id": "a3",
            "question": "If you push a door closer to its hinges, it's harder to open. Why?",
            "options": ["Friction is higher", "You generate less torque for the same force", "The door is heavier there", "Angular momentum is conserved"],
            "correct_index": 1,
            "explanation": "Torque is Force times Distance from the pivot. A smaller distance means you must apply more force to get the same torque."
        },
        {
            "id": "a4",
            "question": "Two solid disks have the same mass, but Disk A is larger in radius. Which is harder to start spinning?",
            "options": ["Disk A", "Disk B", "They are equally hard", "Depends on how fast you want them to spin"],
            "correct_index": 0,
            "explanation": "Disk A has its mass spread further from the center, giving it a larger moment of inertia."
        },
        {
            "id": "a5",
            "question": "What is conserved when there is no external net torque on a system?",
            "options": ["Linear momentum", "Kinetic energy", "Angular momentum", "Mass"],
            "correct_index": 2,
            "explanation": "Just as linear momentum is conserved when there's no net force, angular momentum is conserved when there's no net torque."
        }
    ]
}

# Flat lookup: questionId → { correct_index, explanation, concept_id }
# Built once at import time for O(1) access in the per-question grading endpoint.
QUIZ_INDEX: dict[str, dict] = {}
for _concept_id, _questions in QUIZ_BANK.items():
    for _q in _questions:
        QUIZ_INDEX[_q["id"]] = {
            "correct_index": _q["correct_index"],
            "explanation":   _q["explanation"],
            "concept_id":    _concept_id,
        }
