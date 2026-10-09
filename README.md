# Materialize Learning Lab

## Start the app

Install Node.js 22.12 or newer, then run these commands from the project folder:

```sh
npm ci
npm run dev
```

Open the local URL printed in the terminal. The app runs simulations in your
browser, so no Materialize account or database connection is needed.

## App structure

The **learning path** is the starting page. It introduces the chapters and gives
access to guided labs, a tour, and learning resources. Use the chapter sidebar
to move between topics and activities.

Each chapter is organized into:

- **Overview:** introduces the topic and lists its tutorials and exercises.
- **Tutorials:** interactive lectures that show how data and query results change.
  Playback controls let you step through a scenario or run it automatically.
  Guided runs ask you to predict an effect before revealing an explanation.
- **Exercises:** questions that apply the chapter's ideas, with answer checking,
  hints, and solutions.

Activities include **SQL & Objectives** for the learning goal, SQL reference,
and documentation links. Lectures also have a **Controls tour**. Light and dark
themes are available, and smaller screens use panel selectors to switch between
tables and questions.

**Chapter 1: Changing Relations** has two lectures and one exercise about row
changes, updates, and logical timestamps. **Chapter 2: Incremental Maintenance**
has four lectures and two exercises about changes through filters, projections,
joins, and aggregations.

Later chapters and capstone challenges have overview and navigation pages;
their interactive activities are not implemented yet. The full learning plan
is in [CURRICULUM.md](./CURRICULUM.md).
