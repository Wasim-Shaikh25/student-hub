"""
CivicAudit Management CLI

Usage:
    python -m cli.management create-admin <email> <name>
    python -m cli.management create-demo-data
    python -m cli.management ingest-data <source>
    python -m cli.management migrate-database
"""

import click
import sys
import os
from datetime import datetime
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.database import SessionLocal, engine, Base
from models.models import User, GeographyHierarchy, Issue, UserRole, IssueStatus
from services.auth_service import get_password_hash


@click.group()
def cli():
    """CivicAudit Management CLI"""
    pass


@cli.command()
@click.option('--email', prompt='Email', help='Admin email address')
@click.option('--name', prompt='Name', help='Admin display name')
@click.option('--password', prompt=True, hide_input=True, confirmation_prompt=True, help='Password')
def create_admin(email: str, name: str, password: str):
    """Create a super admin user."""
    db = SessionLocal()

    try:
        # Check if user exists
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            click.echo(f"❌ User with email {email} already exists", err=True)
            return

        # Create admin user
        admin_user = User(
            email=email,
            display_name=name,
            password_hash=get_password_hash(password),
            role=UserRole.ADMIN,
            verification_status="email_verified",
            is_active=True
        )

        db.add(admin_user)
        db.commit()

        click.echo(f"✅ Admin user created successfully!")
        click.echo(f"   Email: {email}")
        click.echo(f"   Name: {name}")
        click.echo(f"   Role: Admin")

    except Exception as e:
        click.echo(f"❌ Error creating admin: {e}", err=True)
        db.rollback()
    finally:
        db.close()


@cli.command()
def create_demo_data():
    """Create demo data for testing."""
    db = SessionLocal()

    try:
        click.echo("Creating demo data...")

        # Create states
        states = [
            {"name": "Maharashtra", "code": "MH"},
            {"name": "Tamil Nadu", "code": "TN"},
            {"name": "Karnataka", "code": "KA"},
            {"name": "Uttar Pradesh", "code": "UP"},
        ]

        state_objects = []
        for state_data in states:
            state = GeographyHierarchy(
                name=state_data["name"],
                level="state",
                official_code=state_data["code"]
            )
            db.add(state)
            state_objects.append(state)

        db.commit()
        click.echo(f"✅ Created {len(state_objects)} states")

        # Create districts
        districts_by_state = {
            "Maharashtra": ["Mumbai", "Pune", "Nagpur"],
            "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
            "Karnataka": ["Bangalore", "Mysore", "Mangalore"],
            "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra"],
        }

        district_count = 0
        for state in state_objects:
            state_districts = districts_by_state.get(state.name, [])
            for district_name in state_districts:
                district = GeographyHierarchy(
                    name=district_name,
                    level="district",
                    official_code=f"{state.official_code}-{district_name[:3].upper()}",
                    parent_id=state.id
                )
                db.add(district)
                district_count += 1

        db.commit()
        click.echo(f"✅ Created {district_count} districts")

        # Create demo users
        demo_users = [
            {
                "email": "citizen@example.com",
                "name": "Demo Citizen",
                "role": UserRole.CITIZEN
            },
            {
                "email": "expert@example.com",
                "name": "Demo Expert",
                "role": UserRole.EXPERT
            },
            {
                "email": "moderator@example.com",
                "name": "Demo Moderator",
                "role": UserRole.MODERATOR
            },
        ]

        for user_data in demo_users:
            user = User(
                email=user_data["email"],
                display_name=user_data["name"],
                password_hash=get_password_hash("demo123456"),
                role=user_data["role"],
                state_id=state_objects[0].id,
                verification_status="email_verified",
                is_active=True
            )
            db.add(user)

        db.commit()
        click.echo(f"✅ Created {len(demo_users)} demo users")
        click.echo("\n📝 Demo User Credentials:")
        for user_data in demo_users:
            click.echo(f"   Email: {user_data['email']}")
            click.echo(f"   Password: demo123456")
            click.echo(f"   Role: {user_data['role']}")
            click.echo()

    except Exception as e:
        click.echo(f"❌ Error creating demo data: {e}", err=True)
        db.rollback()
    finally:
        db.close()


@cli.command()
@click.option('--source', type=click.Choice(['datagov', 'budget', 'pfms', 'eprocure', 'cag', 'all']),
              default='all', help='Data source to ingest from')
@click.option('--year', default='2024-25', help='Financial year (e.g., 2024-25)')
def ingest_data(source: str, year: str):
    """Ingest government data from various sources."""
    click.echo(f"Starting data ingestion from {source} for FY {year}...")

    # Import here to avoid circular imports
    import asyncio
    from services.data_ingestion_service import IngestionPipeline

    db = SessionLocal()

    try:
        pipeline = IngestionPipeline(db)

        async def run_ingestion():
            if source == 'all':
                results = await pipeline.ingest_all_sources(year)
            elif source == 'datagov':
                results = await pipeline._ingest_datagov()
            elif source == 'budget':
                results = await pipeline._ingest_budget(year)
            elif source == 'eprocure':
                results = await pipeline._ingest_eprocure()
            elif source == 'cag':
                results = await pipeline._ingest_cag()
            else:
                results = {"error": "Unknown source"}

            return results

        results = asyncio.run(run_ingestion())

        click.echo(f"\n✅ Ingestion Complete!")
        click.echo(f"Results: {results}")

    except Exception as e:
        click.echo(f"❌ Error during ingestion: {e}", err=True)
    finally:
        db.close()


@cli.command()
def migrate_database():
    """Create/migrate database schema."""
    click.echo("Creating database tables...")

    try:
        Base.metadata.create_all(bind=engine)
        click.echo("✅ Database migration complete!")
    except Exception as e:
        click.echo(f"❌ Migration failed: {e}", err=True)


@cli.command()
def reset_database():
    """⚠️ Reset all data in database (development only)."""
    if click.confirm('⚠️ This will DELETE all data. Are you sure?'):
        if click.confirm('Are you REALLY sure? This cannot be undone!'):
            try:
                Base.metadata.drop_all(bind=engine)
                Base.metadata.create_all(bind=engine)
                click.echo("✅ Database reset complete!")
            except Exception as e:
                click.echo(f"❌ Reset failed: {e}", err=True)
        else:
            click.echo("Cancelled.")
    else:
        click.echo("Cancelled.")


@cli.command()
def list_users():
    """List all users."""
    db = SessionLocal()

    try:
        users = db.query(User).all()

        if not users:
            click.echo("No users found.")
            return

        click.echo(f"\n{'ID':<5} {'Email':<30} {'Name':<20} {'Role':<15}")
        click.echo("=" * 70)

        for user in users:
            click.echo(f"{user.id:<5} {user.email:<30} {user.display_name:<20} {user.role:<15}")

    finally:
        db.close()


@cli.command()
@click.option('--email', prompt='Email to ban')
@click.option('--reason', prompt='Reason for ban')
def ban_user(email: str, reason: str):
    """Ban a user."""
    db = SessionLocal()

    try:
        user = db.query(User).filter(User.email == email).first()

        if not user:
            click.echo(f"❌ User {email} not found", err=True)
            return

        user.is_banned = True
        user.ban_reason = reason
        db.commit()

        click.echo(f"✅ User {email} has been banned")
        click.echo(f"   Reason: {reason}")

    except Exception as e:
        click.echo(f"❌ Error: {e}", err=True)
        db.rollback()
    finally:
        db.close()


@cli.command()
def show_config():
    """Show current configuration."""
    from config.settings import settings

    click.echo("\n📋 Current Configuration:")
    click.echo(f"   App Name: {settings.APP_NAME}")
    click.echo(f"   Environment: {settings.ENVIRONMENT}")
    click.echo(f"   Debug: {settings.DEBUG}")
    click.echo(f"   Database: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else '****'}")
    click.echo(f"   CORS Origins: {', '.join(settings.ALLOWED_ORIGINS)}")
    click.echo(f"   PostGIS Enabled: {settings.POSTGIS_ENABLED}")
    click.echo()


if __name__ == '__main__':
    cli()
